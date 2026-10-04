import { LICENSE_KEY_RE, PLUGIN_ID_RE } from "./ids";
import { getLicense, getPlugin } from "./services";

export type BuyerLookup =
  | { found: false }
  | { found: true; plugin: string; status: "active" | "expired" | "disabled"; expiresOn: number | null; activeServers: number; maxServers: number };

/** What a buyer is allowed to see about their own license. Deliberately leaves out user/note/IPs. */
export function lookupForBuyer(pluginId: string, key: string): BuyerLookup {
  pluginId = pluginId.trim();
  key = key.trim();
  if (!PLUGIN_ID_RE.test(pluginId) || !LICENSE_KEY_RE.test(key)) return { found: false };
  const license = getLicense(key);
  if (!license || license.plugin_id !== pluginId) return { found: false };
  const plugin = getPlugin(pluginId)!;
  const status = !license.enabled ? "disabled" : license.expires_at !== null && license.expires_at < Date.now() ? "expired" : "active";
  return {
    found: true,
    plugin: plugin.name,
    status,
    expiresOn: license.expires_at,
    activeServers: license.active_servers,
    maxServers: license.max_ips,
  };
}
