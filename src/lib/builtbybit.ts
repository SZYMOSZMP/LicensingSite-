import { timingSafeEqual } from "node:crypto";
import { logEvent } from "./db";
import { createLicense, findLicenseBySource, findPluginByMarketplace } from "./services";
import { getSetting } from "./settings";

export type BbbResult = { ok: true; key: string } | { ok: false; status: number; error: string };

function safeEqual(a: string, b: string) {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

/**
 * Handles BuiltByBit's "External license key" placeholder request.
 * BuiltByBit POSTs form fields (builtbybit, user_id, resource_id, version_id, version_number, steam_id, secret)
 * and puts whatever plain text we return into the %%__BBB_LICENSE__%% placeholder of the download.
 */
export function handleBuiltByBit(form: Record<string, string>): BbbResult {
  const expected = getSetting("bbb_secret");
  if (!expected) return { ok: false, status: 503, error: "BuiltByBit integration is not set up" };
  if (!form.secret || !safeEqual(form.secret, expected)) {
    logEvent("builtbybit", "Rejected a request with the wrong secret");
    return { ok: false, status: 401, error: "Invalid secret" };
  }

  const resourceId = (form.resource_id || "").trim();
  const userId = (form.user_id || "").trim();
  if (!/^\d+$/.test(resourceId) || !/^\d+$/.test(userId)) return { ok: false, status: 400, error: "Missing resource_id or user_id" };

  const plugin = findPluginByMarketplace("builtbybit", resourceId);
  if (!plugin) {
    logEvent("builtbybit", `Download of resource ${resourceId} by user ${userId}, but no plugin is linked to that resource`);
    return { ok: false, status: 404, error: "No plugin is linked to this resource" };
  }

  // Re-downloads (new versions) give the buyer the same key instead of a new one each time.
  const existing = findLicenseBySource(plugin.id, "builtbybit", userId);
  if (existing) return { ok: true, key: existing.key };

  try {
    const license = createLicense(plugin.id, { user: `BuiltByBit #${userId}` }, "builtbybit", userId);
    logEvent("builtbybit", `Created license ${license.key} for ${plugin.name} (BuiltByBit user ${userId})`);
    return { ok: true, key: license.key };
  } catch {
    // Two downloads at the same moment: the other one won, so return its key.
    const raced = findLicenseBySource(plugin.id, "builtbybit", userId);
    if (raced) return { ok: true, key: raced.key };
    return { ok: false, status: 500, error: "Could not create license" };
  }
}
