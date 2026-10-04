import { db, logEvent } from "./db";
import { LICENSE_KEY_RE, PLUGIN_ID_RE } from "./ids";
import { verifyPolymartPurchase } from "./polymart";
import { createLicense, getPlugin, isBlacklisted, pruneOldData } from "./services";
import { SESSION_TIMEOUT_MS, STATUS_MESSAGES, type License, type ValidationStatus } from "./types";

const SESSION_RE = /^[A-Za-z0-9-]{8,64}$/;

export interface ValidateRequest {
  pluginId: string;
  key: string;
  sessionId: string;
  nonce: string;
  ip: string;
  polymartUserId?: string | null;
}

let lastPrune = 0;

export async function validateLicense(req: ValidateRequest): Promise<{ status: ValidationStatus; message: string }> {
  const status = await decide(req);
  db()
    .prepare("INSERT INTO checks (plugin_id, license_key, ip, status, created_at) VALUES (?, ?, ?, ?, ?)")
    .run(req.pluginId.slice(0, 64), req.key.slice(0, 64), req.ip, status, Date.now());
  if (Date.now() - lastPrune > 60 * 60 * 1000) {
    lastPrune = Date.now();
    pruneOldData();
  }
  return { status, message: STATUS_MESSAGES[status] };
}

async function decide(req: ValidateRequest): Promise<ValidationStatus> {
  const { pluginId, key, sessionId, ip } = req;
  if (!PLUGIN_ID_RE.test(pluginId) || !LICENSE_KEY_RE.test(key) || !SESSION_RE.test(sessionId)) return "invalid_format";

  const plugin = getPlugin(pluginId);
  if (!plugin) return "not_found";

  let license = db().prepare("SELECT * FROM licenses WHERE key = ? AND plugin_id = ?").get(key, pluginId) as License | undefined;

  // Polymart downloads carry "pm_<license>" baked into the jar. The first time we see one,
  // confirm the purchase with Polymart and turn it into a normal license.
  if (!license && key.startsWith("pm_") && plugin.marketplace === "polymart" && plugin.marketplace_id) {
    const result = await verifyPolymartPurchase(key.slice(3), plugin.marketplace_id);
    if (!result.ok) {
      logEvent("polymart", `Rejected ${key} for ${plugin.name}: ${result.error}`);
      return "invalid_polymart";
    }
    const user = req.polymartUserId && /^\d{1,20}$/.test(req.polymartUserId) ? `Polymart #${req.polymartUserId}` : null;
    try {
      createLicense(pluginId, { key, user }, "polymart", key);
      logEvent("polymart", `Created license ${key} for ${plugin.name}${user ? ` (${user})` : ""}`);
    } catch {
      // Another request created it at the same moment; fall through to the normal lookup.
    }
    license = db().prepare("SELECT * FROM licenses WHERE key = ? AND plugin_id = ?").get(key, pluginId) as License | undefined;
  }

  if (!license) return "not_found";
  if (!license.enabled) return "disabled";
  if (license.expires_at !== null && license.expires_at < Date.now()) return "expired";
  if (isBlacklisted(ip)) return "blacklisted";

  const now = Date.now();
  const claimed = db().transaction(() => {
    if (license!.max_ips > 0) {
      // Count distinct IPs of other live servers. A restart from the same IP never counts twice.
      const others = db()
        .prepare(
          `SELECT COUNT(DISTINCT ip) AS n FROM license_sessions
           WHERE license_key = ? AND last_seen > ? AND ip != ? AND session_id != ?`,
        )
        .get(key, now - SESSION_TIMEOUT_MS, ip, sessionId) as { n: number };
      if (others.n >= license!.max_ips) return false;
    }
    db()
      .prepare(
        `INSERT INTO license_sessions (license_key, session_id, ip, started_at, last_seen) VALUES (?, ?, ?, ?, ?)
         ON CONFLICT (license_key, session_id) DO UPDATE SET ip = excluded.ip, last_seen = excluded.last_seen`,
      )
      .run(key, sessionId, ip, now, now);
    db().prepare("UPDATE licenses SET last_validated_at = ? WHERE key = ?").run(now, key);
    return true;
  })();
  return claimed ? "valid" : "max_ips";
}

/** Keeps a server counted as active. Only sessions created by a successful validation can be refreshed. */
export function heartbeat(pluginId: string, key: string, sessionId: string, ip: string, shutdown: boolean): boolean {
  if (!PLUGIN_ID_RE.test(pluginId) || !LICENSE_KEY_RE.test(key) || !SESSION_RE.test(sessionId)) return false;
  const owns = db().prepare("SELECT 1 FROM licenses WHERE key = ? AND plugin_id = ?").get(key, pluginId);
  if (!owns) return false;
  if (shutdown) {
    return db().prepare("DELETE FROM license_sessions WHERE license_key = ? AND session_id = ? AND ip = ?").run(key, sessionId, ip).changes > 0;
  }
  return (
    db()
      .prepare("UPDATE license_sessions SET last_seen = ? WHERE license_key = ? AND session_id = ? AND ip = ?")
      .run(Date.now(), key, sessionId, ip).changes > 0
  );
}
