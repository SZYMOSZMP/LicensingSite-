package xkixos.licensing;

import com.google.gson.JsonElement;
import com.google.gson.JsonObject;
import com.google.gson.JsonParser;
import org.bukkit.Bukkit;
import org.bukkit.event.EventHandler;
import org.bukkit.event.Listener;
import org.bukkit.event.server.PluginDisableEvent;
import org.bukkit.plugin.java.JavaPlugin;

import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.security.KeyFactory;
import java.security.PublicKey;
import java.security.Signature;
import java.security.spec.X509EncodedKeySpec;
import java.util.Arrays;
import java.util.Base64;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;
import java.util.logging.Logger;

/**
 * Xkixos Licensing - drop this single class into your plugin and call
 *
 * <pre>
 * if (!XkixosLicense.validateKey(this, "yourPluginId")) {
 *     getServer().getPluginManager().disablePlugin(this);
 *     return;
 * }
 * </pre>
 *
 * at the top of onEnable. Buyers put their key in plugins/YourPlugin/license.txt
 * (created automatically). BuiltByBit and Polymart downloads have the key baked in.
 *
 * Works on Spigot, Paper and Folia (1.8+). Only needs Gson, which every server ships with.
 */
public final class XkixosLicense {

    // Filled in by your Xkixos Licensing dashboard when you download this class.
    private static final String BASE_URL = "__XKL_BASE_URL__";
    private static final String PUBLIC_KEY = "__XKL_PUBLIC_KEY__";

    private static final String LICENSE_FILE = "license.txt";
    private static final int TIMEOUT_MS = 8000;
    private static final long HEARTBEAT_SECONDS = 30;

    // Marketplace placeholders. BuiltByBit / Polymart replace these inside the jar on download.
    // They are deliberately not final so they stay as plain strings in the class file.
    private static String bbbLicense = "%%__BBB_LICENSE__%%";
    private static String polymart = "%%__POLYMART__%%";
    private static String polymartLicense = "%%__LICENSE__%%";
    private static String polymartUser = "%%__USER__%%";

    private static ScheduledExecutorService heartbeat;
    private static String hbPluginId;
    private static String hbKey;
    private static String hbSession;

    private XkixosLicense() {
    }

    /**
     * Checks the license with your Xkixos Licensing server.
     *
     * @param plugin   your plugin instance
     * @param pluginId the 8 character plugin ID from your dashboard
     * @return true if the license is valid, false otherwise (the reason is logged to console)
     */
    public static boolean validateKey(JavaPlugin plugin, String pluginId) {
        Logger log = plugin.getLogger();
        String key = getLicenseKey(plugin);
        if (key == null || key.isEmpty()) {
            log.severe("No license key found! Put your key in plugins/" + plugin.getDataFolder().getName() + "/" + LICENSE_FILE + " and restart the server.");
            return false;
        }

        String sessionId = UUID.randomUUID().toString();
        String nonce = UUID.randomUUID().toString();
        try {
            StringBuilder url = new StringBuilder(BASE_URL)
                    .append("/api/validate/").append(encode(pluginId)).append('/').append(encode(key))
                    .append("?sessionId=").append(sessionId)
                    .append("&nonce=").append(nonce);
            String pmUser = polymartUserId();
            if (pmUser != null) url.append("&polymartUserId=").append(encode(pmUser));

            JsonObject res = parse(request("GET", url.toString(), null));
            String status = string(res, "status");
            String message = string(res, "message");

            if (!nonce.equals(string(res, "nonce")) || !key.equals(string(res, "key")) || !pluginId.equals(string(res, "pluginId"))) {
                log.severe("License check failed (response does not match the request)");
                return false;
            }
            String payload = "xkl1|" + pluginId + "|" + key + "|" + status + "|" + nonce;
            if (!verifySignature(payload, string(res, "signature"))) {
                log.severe("License check failed (invalid signature)");
                return false;
            }
            if (!"valid".equals(status)) {
                log.severe("License check failed: " + message + " (" + status + ")");
                return false;
            }

            log.info("License is valid. Thank you for your purchase!");
            startHeartbeat(plugin, pluginId, key, sessionId);
            return true;
        } catch (Exception e) {
            log.severe("Could not reach the license server: " + e.getMessage());
            return false;
        }
    }

    /** Returns the key baked in by a marketplace, or the one from license.txt (created if missing). */
    public static String getLicenseKey(JavaPlugin plugin) {
        if (!bbbLicense.startsWith("%%__")) return bbbLicense.trim();
        if ("1".equals(polymart) && !polymartLicense.startsWith("%%__")) return "pm_" + polymartLicense.trim();

        File file = new File(plugin.getDataFolder(), LICENSE_FILE);
        try {
            if (!file.exists()) {
                plugin.getDataFolder().mkdirs();
                Files.write(file.toPath(), Arrays.asList(
                        "# Paste your license key on the line below, then restart the server.",
                        ""), StandardCharsets.UTF_8);
                return null;
            }
            List<String> lines = Files.readAllLines(file.toPath(), StandardCharsets.UTF_8);
            for (String line : lines) {
                String trimmed = line.trim();
                if (!trimmed.isEmpty() && !trimmed.startsWith("#")) return trimmed;
            }
        } catch (Exception e) {
            plugin.getLogger().severe("Could not read " + file.getPath() + ": " + e.getMessage());
        }
        return null;
    }

    private static String polymartUserId() {
        return "1".equals(polymart) && !polymartUser.startsWith("%%__") ? polymartUser.trim() : null;
    }

    // ---------------------------------------------------------------- heartbeat

    private static synchronized void startHeartbeat(JavaPlugin plugin, String pluginId, String key, String sessionId) {
        stopHeartbeat(false);
        hbPluginId = pluginId;
        hbKey = key;
        hbSession = sessionId;
        heartbeat = Executors.newSingleThreadScheduledExecutor(r -> {
            Thread t = new Thread(r, plugin.getName() + "-license-heartbeat");
            t.setDaemon(true);
            return t;
        });
        heartbeat.scheduleAtFixedRate(() -> sendHeartbeat(false), HEARTBEAT_SECONDS, HEARTBEAT_SECONDS, TimeUnit.SECONDS);

        Bukkit.getPluginManager().registerEvents(new Listener() {
            @EventHandler
            public void onDisable(PluginDisableEvent event) {
                if (event.getPlugin() == plugin) stopHeartbeat(true);
            }
        }, plugin);
    }

    private static synchronized void stopHeartbeat(boolean notifyServer) {
        if (heartbeat == null) return;
        heartbeat.shutdownNow();
        heartbeat = null;
        if (notifyServer) sendHeartbeat(true);
    }

    private static void sendHeartbeat(boolean shutdown) {
        try {
            JsonObject body = new JsonObject();
            body.addProperty("sessionId", hbSession);
            if (shutdown) body.addProperty("shutdown", true);
            request("POST", BASE_URL + "/api/heartbeat/" + encode(hbPluginId) + "/" + encode(hbKey), body.toString());
        } catch (Exception ignored) {
            // A missed heartbeat only affects the "active servers" count.
        }
    }

    // ---------------------------------------------------------------- helpers

    private static String request(String method, String url, String body) throws Exception {
        HttpURLConnection con = (HttpURLConnection) new URL(url).openConnection();
        con.setRequestMethod(method);
        con.setConnectTimeout(TIMEOUT_MS);
        con.setReadTimeout(TIMEOUT_MS);
        con.setRequestProperty("User-Agent", "XkixosLicense/1.0");
        con.setRequestProperty("Accept", "application/json");
        if (body != null) {
            con.setDoOutput(true);
            con.setRequestProperty("Content-Type", "application/json");
            try (OutputStream out = con.getOutputStream()) {
                out.write(body.getBytes(StandardCharsets.UTF_8));
            }
        }
        int code = con.getResponseCode();
        InputStream in = code >= 400 ? con.getErrorStream() : con.getInputStream();
        if (in == null) throw new IllegalStateException("HTTP " + code);
        try (InputStream stream = in) {
            ByteArrayOutputStream buf = new ByteArrayOutputStream();
            byte[] chunk = new byte[4096];
            int n;
            while ((n = stream.read(chunk)) != -1) buf.write(chunk, 0, n);
            return new String(buf.toByteArray(), StandardCharsets.UTF_8);
        }
    }

    @SuppressWarnings("deprecation")
    private static JsonObject parse(String json) {
        // new JsonParser().parse() keeps this working on old servers with Gson 2.2.
        JsonElement el = new JsonParser().parse(json);
        if (!el.isJsonObject()) throw new IllegalStateException("Unexpected response from license server");
        return el.getAsJsonObject();
    }

    private static String string(JsonObject obj, String field) {
        JsonElement el = obj.get(field);
        return el == null || el.isJsonNull() ? "" : el.getAsString();
    }

    private static boolean verifySignature(String data, String signature) {
        try {
            PublicKey key = KeyFactory.getInstance("RSA").generatePublic(new X509EncodedKeySpec(Base64.getDecoder().decode(PUBLIC_KEY)));
            Signature sig = Signature.getInstance("SHA256withRSA");
            sig.initVerify(key);
            sig.update(data.getBytes(StandardCharsets.UTF_8));
            return sig.verify(Base64.getDecoder().decode(signature));
        } catch (Exception e) {
            return false;
        }
    }

    private static String encode(String value) throws Exception {
        return URLEncoder.encode(value, "UTF-8").replace("+", "%20");
    }
}
