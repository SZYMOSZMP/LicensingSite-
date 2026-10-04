import type { BlacklistEntry, License, Plugin } from "./types";

const iso = (ms: number | null) => (ms === null ? null : new Date(ms).toISOString());

export function pluginJson(p: Plugin & { license_count?: number; active_servers?: number }) {
  return {
    id: p.id,
    name: p.name,
    icon: p.icon,
    description: p.description,
    marketplace: p.marketplace === "none" ? null : { type: p.marketplace, id: p.marketplace_id, url: p.marketplace_url },
    defaultMaxIps: p.default_max_ips,
    defaultDurationDays: p.default_duration_days,
    licenseCount: p.license_count,
    activeServers: p.active_servers,
    createdAt: iso(p.created_at),
  };
}

export function licenseJson(l: License & { active_servers?: number }) {
  return {
    key: l.key,
    pluginId: l.plugin_id,
    user: l.user,
    note: l.note,
    maxIps: l.max_ips,
    expiresOn: l.expires_at === null ? "Never" : iso(l.expires_at),
    enabled: !!l.enabled,
    source: l.source,
    activeServers: l.active_servers,
    lastValidatedAt: iso(l.last_validated_at),
    createdAt: iso(l.created_at),
  };
}

export function blacklistJson(b: BlacklistEntry) {
  return { id: b.id, ip: b.ip, reason: b.reason, createdAt: iso(b.created_at) };
}

/** Maps camelCase API fields to the internal input names. */
export function licenseInputFromApi(body: Record<string, unknown>) {
  return {
    key: body.key,
    user: body.user,
    note: body.note,
    max_ips: body.maxIps,
    expires_at: body.expiresOn,
    enabled: body.enabled,
  };
}

export function pluginInputFromApi(body: Record<string, unknown>) {
  const mp = body.marketplace as { type?: unknown; id?: unknown; url?: unknown } | null | undefined;
  return {
    name: body.name,
    icon: body.icon,
    description: body.description,
    marketplace: mp === null ? "none" : mp?.type,
    marketplace_id: mp === null ? "" : mp?.url ?? mp?.id,
    default_max_ips: body.defaultMaxIps,
    default_duration_days: body.defaultDurationDays,
  };
}
