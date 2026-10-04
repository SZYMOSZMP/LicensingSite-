import { db } from "./db";
import { newId, newLicenseKey, newPluginId, LICENSE_KEY_RE } from "./ids";
import { IP_RE } from "./ip";
import { parseMarketplaceId } from "./marketplace";
import {
  MARKETPLACES,
  SESSION_TIMEOUT_MS,
  UserError,
  type BlacklistEntry,
  type License,
  type LicenseSource,
  type LicenseWithStats,
  type Marketplace,
  type Plugin,
  type PluginWithStats,
} from "./types";

const DAY = 24 * 60 * 60 * 1000;

// ---------- input parsing ----------

function text(value: unknown, max = 200): string | null {
  if (value === undefined || value === null) return null;
  const s = String(value).trim();
  if (!s) return null;
  if (s.length > max) throw new UserError(`Value is too long (max ${max} characters)`);
  return s;
}

function int(value: unknown, field: string, min = 0, max = 1_000_000): number {
  const n = typeof value === "number" ? value : Number(String(value ?? "").trim());
  if (!Number.isInteger(n) || n < min || n > max) throw new UserError(`${field} must be a whole number between ${min} and ${max}`);
  return n;
}

/** Accepts null / "" / "never" for no expiry, or any date string (YYYY-MM-DD, ISO 8601). */
export function parseExpiry(value: unknown): number | null {
  if (value === undefined || value === null) return null;
  if (typeof value === "number") return value;
  const s = String(value).trim();
  if (!s || s.toLowerCase() === "never") return null;
  // A bare date means "valid through the end of that day" (UTC).
  const ms = /^\d{4}-\d{2}-\d{2}$/.test(s) ? Date.parse(`${s}T23:59:59Z`) : Date.parse(s);
  if (Number.isNaN(ms)) throw new UserError("Expiry must be a date like 2026-12-31, or 'Never'");
  return ms;
}

// ---------- plugins ----------

export interface PluginInput {
  name?: unknown;
  icon?: unknown;
  description?: unknown;
  marketplace?: unknown;
  marketplace_id?: unknown;
  default_max_ips?: unknown;
  default_duration_days?: unknown;
}

function pluginFields(input: PluginInput, existing?: Plugin) {
  const name = input.name !== undefined ? text(input.name, 80) : existing?.name ?? null;
  if (!name) throw new UserError("Plugin name is required");

  const icon = input.icon !== undefined ? text(input.icon, 500) : existing?.icon ?? null;
  if (icon && !/^https?:\/\//.test(icon)) throw new UserError("Icon must be an http(s) URL");

  const marketplace = (input.marketplace !== undefined ? String(input.marketplace) : existing?.marketplace ?? "none") as Marketplace;
  if (!MARKETPLACES.includes(marketplace)) throw new UserError("Unknown marketplace");

  let marketplaceId: string | null = existing?.marketplace_id ?? null;
  let marketplaceUrl: string | null = existing?.marketplace_url ?? null;
  if (input.marketplace_id !== undefined || input.marketplace !== undefined) {
    const raw =
      input.marketplace_id !== undefined
        ? text(input.marketplace_id, 300) ?? ""
        : existing?.marketplace_url || existing?.marketplace_id || "";
    marketplaceId = parseMarketplaceId(marketplace, raw);
    marketplaceUrl = /^https?:\/\//.test(raw) ? raw : null;
    if (marketplace !== "none" && !marketplaceId) {
      throw new UserError("Enter the marketplace URL or numeric ID for this plugin");
    }
  }
  if (marketplace === "none") {
    marketplaceId = null;
    marketplaceUrl = null;
  }

  const defaultMaxIps =
    input.default_max_ips !== undefined && input.default_max_ips !== ""
      ? int(input.default_max_ips, "Default max servers", 0, 10_000)
      : existing?.default_max_ips ?? 1;
  const defaultDuration =
    input.default_duration_days !== undefined && input.default_duration_days !== ""
      ? int(input.default_duration_days, "Default duration", 0, 100_000)
      : existing?.default_duration_days ?? 0;

  return {
    name,
    icon,
    description: input.description !== undefined ? text(input.description, 500) : existing?.description ?? null,
    marketplace,
    marketplace_id: marketplaceId,
    marketplace_url: marketplaceUrl,
    default_max_ips: defaultMaxIps,
    default_duration_days: defaultDuration,
  };
}

function assertMarketplaceFree(marketplace: Marketplace, id: string | null, exceptPluginId?: string) {
  if (marketplace === "none" || !id) return;
  const clash = db()
    .prepare("SELECT id, name FROM plugins WHERE marketplace = ? AND marketplace_id = ? AND id != ?")
    .get(marketplace, id, exceptPluginId ?? "") as { id: string; name: string } | undefined;
  if (clash) throw new UserError(`That marketplace resource is already linked to "${clash.name}"`);
}

const PLUGIN_STATS_SQL = `
  SELECT p.*,
    (SELECT COUNT(*) FROM licenses l WHERE l.plugin_id = p.id) AS license_count,
    (SELECT COUNT(*) FROM license_sessions s JOIN licenses l ON l.key = s.license_key
       WHERE l.plugin_id = p.id AND s.last_seen > @cutoff) AS active_servers
  FROM plugins p`;

export function listPlugins(): PluginWithStats[] {
  return db()
    .prepare(`${PLUGIN_STATS_SQL} ORDER BY p.created_at DESC`)
    .all({ cutoff: Date.now() - SESSION_TIMEOUT_MS }) as PluginWithStats[];
}

export function getPlugin(id: string): PluginWithStats | null {
  return (
    (db()
      .prepare(`${PLUGIN_STATS_SQL} WHERE p.id = @id`)
      .get({ id, cutoff: Date.now() - SESSION_TIMEOUT_MS }) as PluginWithStats | undefined) ?? null
  );
}

export function findPluginByMarketplace(marketplace: Marketplace, marketplaceId: string): Plugin | null {
  return (
    (db()
      .prepare("SELECT * FROM plugins WHERE marketplace = ? AND marketplace_id = ?")
      .get(marketplace, marketplaceId) as Plugin | undefined) ?? null
  );
}

export function createPlugin(input: PluginInput): Plugin {
  const f = pluginFields(input);
  assertMarketplaceFree(f.marketplace, f.marketplace_id);
  let id = newPluginId();
  while (db().prepare("SELECT 1 FROM plugins WHERE id = ?").get(id)) id = newPluginId();
  db()
    .prepare(
      `INSERT INTO plugins (id, name, icon, description, marketplace, marketplace_id, marketplace_url,
         default_max_ips, default_duration_days, created_at)
       VALUES (@id, @name, @icon, @description, @marketplace, @marketplace_id, @marketplace_url,
         @default_max_ips, @default_duration_days, @created_at)`,
    )
    .run({ ...f, id, created_at: Date.now() });
  return getPlugin(id)!;
}

export function updatePlugin(id: string, input: PluginInput): Plugin {
  const existing = getPlugin(id);
  if (!existing) throw new UserError("Plugin not found", 404);
  const f = pluginFields(input, existing);
  assertMarketplaceFree(f.marketplace, f.marketplace_id, id);
  db()
    .prepare(
      `UPDATE plugins SET name = @name, icon = @icon, description = @description, marketplace = @marketplace,
         marketplace_id = @marketplace_id, marketplace_url = @marketplace_url,
         default_max_ips = @default_max_ips, default_duration_days = @default_duration_days
       WHERE id = @id`,
    )
    .run({ ...f, id });
  return getPlugin(id)!;
}

export function deletePlugin(id: string) {
  const res = db().prepare("DELETE FROM plugins WHERE id = ?").run(id);
  if (!res.changes) throw new UserError("Plugin not found", 404);
  db().prepare("DELETE FROM checks WHERE plugin_id = ?").run(id);
}

// ---------- licenses ----------

export interface LicenseInput {
  key?: unknown;
  user?: unknown;
  note?: unknown;
  max_ips?: unknown;
  expires_at?: unknown;
  enabled?: unknown;
}

const LICENSE_STATS_SQL = `
  SELECT l.*, p.name AS plugin_name,
    (SELECT COUNT(*) FROM license_sessions s WHERE s.license_key = l.key AND s.last_seen > @cutoff) AS active_servers
  FROM licenses l JOIN plugins p ON p.id = l.plugin_id`;

export function listLicenses(opts: { pluginId?: string; q?: string; limit?: number; offset?: number } = {}) {
  const where: string[] = [];
  const params: Record<string, unknown> = { cutoff: Date.now() - SESSION_TIMEOUT_MS };
  if (opts.pluginId) {
    where.push("l.plugin_id = @pluginId");
    params.pluginId = opts.pluginId;
  }
  if (opts.q) {
    where.push("(l.key LIKE @q OR l.user LIKE @q OR l.note LIKE @q OR l.source_ref LIKE @q)");
    params.q = `%${opts.q}%`;
  }
  const whereSql = where.length ? ` WHERE ${where.join(" AND ")}` : "";
  const limit = Math.min(Math.max(opts.limit ?? 50, 1), 500);
  const offset = Math.max(opts.offset ?? 0, 0);
  const rows = db()
    .prepare(`${LICENSE_STATS_SQL}${whereSql} ORDER BY l.created_at DESC LIMIT ${limit} OFFSET ${offset}`)
    .all(params) as LicenseWithStats[];
  const total = (db().prepare(`SELECT COUNT(*) AS n FROM licenses l${whereSql}`).get(params) as { n: number }).n;
  return { rows, total };
}

export function getLicense(key: string): LicenseWithStats | null {
  return (
    (db()
      .prepare(`${LICENSE_STATS_SQL} WHERE l.key = @key`)
      .get({ key, cutoff: Date.now() - SESSION_TIMEOUT_MS }) as LicenseWithStats | undefined) ?? null
  );
}

function bool(value: unknown, fallback: boolean): boolean {
  if (value === undefined || value === null || value === "") return fallback;
  if (typeof value === "boolean") return value;
  return ["1", "true", "on", "yes"].includes(String(value).toLowerCase());
}

export function createLicense(
  pluginId: string,
  input: LicenseInput,
  source: LicenseSource = "manual",
  sourceRef: string | null = null,
): License {
  const plugin = getPlugin(pluginId);
  if (!plugin) throw new UserError("Plugin not found", 404);

  const key = text(input.key, 64) ?? newLicenseKey();
  if (!LICENSE_KEY_RE.test(key)) throw new UserError("License keys may only contain letters, numbers, - and _ (max 64)");
  if (db().prepare("SELECT 1 FROM licenses WHERE key = ?").get(key)) throw new UserError("That license key already exists");

  const maxIps =
    input.max_ips !== undefined && input.max_ips !== "" ? int(input.max_ips, "Max servers", 0, 10_000) : plugin.default_max_ips;
  const expiresAt =
    input.expires_at !== undefined
      ? parseExpiry(input.expires_at)
      : plugin.default_duration_days > 0
        ? Date.now() + plugin.default_duration_days * DAY
        : null;

  db()
    .prepare(
      `INSERT INTO licenses (key, plugin_id, user, note, max_ips, expires_at, enabled, source, source_ref, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      key,
      pluginId,
      text(input.user, 120),
      text(input.note, 500),
      maxIps,
      expiresAt,
      bool(input.enabled, true) ? 1 : 0,
      source,
      sourceRef,
      Date.now(),
    );
  return getLicense(key)!;
}

export function updateLicense(key: string, input: LicenseInput): License {
  const existing = getLicense(key);
  if (!existing) throw new UserError("License not found", 404);
  db()
    .prepare("UPDATE licenses SET user = ?, note = ?, max_ips = ?, expires_at = ?, enabled = ? WHERE key = ?")
    .run(
      input.user !== undefined ? text(input.user, 120) : existing.user,
      input.note !== undefined ? text(input.note, 500) : existing.note,
      input.max_ips !== undefined && input.max_ips !== "" ? int(input.max_ips, "Max servers", 0, 10_000) : existing.max_ips,
      input.expires_at !== undefined ? parseExpiry(input.expires_at) : existing.expires_at,
      input.enabled !== undefined ? (bool(input.enabled, true) ? 1 : 0) : existing.enabled,
      key,
    );
  return getLicense(key)!;
}

export function setLicenseEnabled(key: string, enabled: boolean) {
  const res = db().prepare("UPDATE licenses SET enabled = ? WHERE key = ?").run(enabled ? 1 : 0, key);
  if (!res.changes) throw new UserError("License not found", 404);
}

export function deleteLicense(key: string) {
  const res = db().prepare("DELETE FROM licenses WHERE key = ?").run(key);
  if (!res.changes) throw new UserError("License not found", 404);
}

/** Forgets all servers using the license, freeing up its server slots. */
export function resetLicenseSessions(key: string) {
  db().prepare("DELETE FROM license_sessions WHERE license_key = ?").run(key);
}

export function licenseSessions(key: string) {
  return db()
    .prepare("SELECT * FROM license_sessions WHERE license_key = ? AND last_seen > ? ORDER BY started_at DESC")
    .all(key, Date.now() - SESSION_TIMEOUT_MS) as {
    session_id: string;
    ip: string;
    started_at: number;
    last_seen: number;
  }[];
}

export function findLicenseBySource(pluginId: string, source: LicenseSource, sourceRef: string): License | null {
  return (
    (db()
      .prepare("SELECT * FROM licenses WHERE plugin_id = ? AND source = ? AND source_ref = ?")
      .get(pluginId, source, sourceRef) as License | undefined) ?? null
  );
}

// ---------- blacklist ----------

export function listBlacklist(): BlacklistEntry[] {
  return db().prepare("SELECT * FROM blacklist ORDER BY created_at DESC").all() as BlacklistEntry[];
}

export function getBlacklistEntry(id: string): BlacklistEntry | null {
  return (db().prepare("SELECT * FROM blacklist WHERE id = ?").get(id) as BlacklistEntry | undefined) ?? null;
}

function checkIp(value: unknown): string {
  const ip = text(value, 45);
  if (!ip || !IP_RE.test(ip)) throw new UserError("Enter a valid IP address");
  return ip;
}

export function addBlacklist(input: { ip?: unknown; reason?: unknown }): BlacklistEntry {
  const ip = checkIp(input.ip);
  if (db().prepare("SELECT 1 FROM blacklist WHERE ip = ?").get(ip)) throw new UserError("That IP is already blacklisted");
  const id = newId();
  db()
    .prepare("INSERT INTO blacklist (id, ip, reason, created_at) VALUES (?, ?, ?, ?)")
    .run(id, ip, text(input.reason, 300), Date.now());
  return getBlacklistEntry(id)!;
}

export function updateBlacklist(id: string, input: { ip?: unknown; reason?: unknown }): BlacklistEntry {
  const existing = getBlacklistEntry(id);
  if (!existing) throw new UserError("Blacklist entry not found", 404);
  const ip = input.ip !== undefined ? checkIp(input.ip) : existing.ip;
  if (db().prepare("SELECT 1 FROM blacklist WHERE ip = ? AND id != ?").get(ip, id)) throw new UserError("That IP is already blacklisted");
  db()
    .prepare("UPDATE blacklist SET ip = ?, reason = ? WHERE id = ?")
    .run(ip, input.reason !== undefined ? text(input.reason, 300) : existing.reason, id);
  return getBlacklistEntry(id)!;
}

export function removeBlacklist(id: string) {
  const res = db().prepare("DELETE FROM blacklist WHERE id = ?").run(id);
  if (!res.changes) throw new UserError("Blacklist entry not found", 404);
}

export function isBlacklisted(ip: string): boolean {
  return !!db().prepare("SELECT 1 FROM blacklist WHERE ip = ?").get(ip);
}

// ---------- analytics ----------

export function overviewStats() {
  const d = db();
  const cutoff = Date.now() - SESSION_TIMEOUT_MS;
  const since24h = Date.now() - DAY;
  const one = (sql: string, ...p: unknown[]) => (d.prepare(sql).get(...p) as { n: number }).n;
  return {
    plugins: one("SELECT COUNT(*) AS n FROM plugins"),
    licenses: one("SELECT COUNT(*) AS n FROM licenses"),
    activeServers: one("SELECT COUNT(*) AS n FROM license_sessions WHERE last_seen > ?", cutoff),
    checks24h: one("SELECT COUNT(*) AS n FROM checks WHERE created_at > ?", since24h),
    valid24h: one("SELECT COUNT(*) AS n FROM checks WHERE created_at > ? AND status = 'valid'", since24h),
    totalChecks: one("SELECT COUNT(*) AS n FROM checks"),
  };
}

/** Valid vs rejected checks per day for the last `days` days (UTC). */
export function dailyChecks(days = 14, pluginId?: string) {
  const start = new Date();
  start.setUTCHours(0, 0, 0, 0);
  const from = start.getTime() - (days - 1) * DAY;
  const rows = db()
    .prepare(
      `SELECT CAST((created_at - ?) / ${DAY} AS INTEGER) AS day,
              SUM(status = 'valid') AS valid, SUM(status != 'valid') AS rejected
       FROM checks WHERE created_at >= ? ${pluginId ? "AND plugin_id = ?" : ""}
       GROUP BY day`,
    )
    .all(...[from, from, ...(pluginId ? [pluginId] : [])]) as { day: number; valid: number; rejected: number }[];
  return Array.from({ length: days }, (_, i) => {
    const row = rows.find((r) => r.day === i);
    return { date: new Date(from + i * DAY).toISOString().slice(0, 10), valid: row?.valid ?? 0, rejected: row?.rejected ?? 0 };
  });
}

export function recentChecks(opts: { licenseKey?: string; pluginId?: string; status?: string; limit?: number } = {}) {
  const where: string[] = [];
  const params: unknown[] = [];
  if (opts.licenseKey) {
    where.push("c.license_key = ?");
    params.push(opts.licenseKey);
  }
  if (opts.pluginId) {
    where.push("c.plugin_id = ?");
    params.push(opts.pluginId);
  }
  if (opts.status === "valid") where.push("c.status = 'valid'");
  else if (opts.status === "rejected") where.push("c.status != 'valid'");
  const limit = Math.min(opts.limit ?? 100, 500);
  return db()
    .prepare(
      `SELECT c.*, p.name AS plugin_name FROM checks c LEFT JOIN plugins p ON p.id = c.plugin_id
       ${where.length ? `WHERE ${where.join(" AND ")}` : ""} ORDER BY c.id DESC LIMIT ${limit}`,
    )
    .all(...params) as {
    id: number;
    plugin_id: string;
    plugin_name: string | null;
    license_key: string;
    ip: string;
    status: string;
    created_at: number;
  }[];
}

export function recentEvents(limit = 20) {
  return db().prepare("SELECT * FROM events ORDER BY id DESC LIMIT ?").all(limit) as {
    id: number;
    kind: string;
    message: string;
    created_at: number;
  }[];
}

/** Drops old analytics rows and dead sessions. Cheap enough to run on every validation burst. */
export function pruneOldData() {
  const d = db();
  d.prepare("DELETE FROM checks WHERE created_at < ?").run(Date.now() - 90 * DAY);
  d.prepare("DELETE FROM events WHERE created_at < ?").run(Date.now() - 90 * DAY);
  d.prepare("DELETE FROM license_sessions WHERE last_seen < ?").run(Date.now() - DAY);
  d.prepare("DELETE FROM sessions WHERE expires_at < ?").run(Date.now());
}
