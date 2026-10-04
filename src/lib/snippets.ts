/** Code snippets shown in the dashboard and guides. */

export function onEnableJava(pluginId: string, pkg = "xkixos.licensing") {
  return `import ${pkg}.XkixosLicense;

public final class MyPlugin extends JavaPlugin {

    @Override
    public void onEnable() {
        if (!XkixosLicense.validateKey(this, "${pluginId}")) {
            getServer().getPluginManager().disablePlugin(this);
            return;
        }

        // ...the rest of your plugin starts here
    }
}`;
}

export function onEnableKotlin(pluginId: string, pkg = "xkixos.licensing") {
  return `import ${pkg}.XkixosLicense

class MyPlugin : JavaPlugin() {

    override fun onEnable() {
        if (!XkixosLicense.validateKey(this, "${pluginId}")) {
            server.pluginManager.disablePlugin(this)
            return
        }

        // ...the rest of your plugin starts here
    }
}`;
}

export function curlValidate(baseUrl: string, pluginId: string) {
  return `curl "${baseUrl}/api/validate/${pluginId}/LICENSE-KEY?sessionId=$(uuidgen)&nonce=$(uuidgen)"`;
}

export function nodeValidate(baseUrl: string, pluginId: string) {
  return `import crypto from "node:crypto";

const BASE_URL = "${baseUrl}";
const PLUGIN_ID = "${pluginId}";
// Dashboard -> Settings -> Public key (PEM)
const PUBLIC_KEY = \`-----BEGIN PUBLIC KEY-----
...
-----END PUBLIC KEY-----\`;

const SESSION_ID = crypto.randomUUID(); // one per run of your program

export async function checkLicense(key) {
  const nonce = crypto.randomUUID();
  const res = await fetch(\`\${BASE_URL}/api/validate/\${PLUGIN_ID}/\${encodeURIComponent(key)}?sessionId=\${SESSION_ID}&nonce=\${nonce}\`);
  const body = await res.json();

  // Make sure the answer really came from your server and is fresh
  const payload = ["xkl1", body.pluginId, body.key, body.status, body.nonce].join("|");
  const signed = crypto.verify("sha256", Buffer.from(payload), PUBLIC_KEY, Buffer.from(body.signature, "base64"));
  if (!signed || body.nonce !== nonce || body.key !== key || body.pluginId !== PLUGIN_ID) return false;

  if (body.status !== "valid") console.error("License rejected:", body.message);
  return body.status === "valid";
}

// Optional: keep the "servers online" counter accurate (every 30 seconds)
export function startHeartbeat(key) {
  setInterval(() => {
    fetch(\`\${BASE_URL}/api/heartbeat/\${PLUGIN_ID}/\${encodeURIComponent(key)}\`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId: SESSION_ID }),
    }).catch(() => {});
  }, 30_000);
}`;
}
