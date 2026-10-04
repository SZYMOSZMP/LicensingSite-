import { getSetting } from "./settings";

const VERIFY_URL = "https://api.polymart.org/v1/verifyPurchase";

/**
 * Asks Polymart (Voxel Shop) whether `license` is a real purchase of `resourceId`.
 * Uses the %%__LICENSE__%% flow from Polymart's API docs: license + resource_id.
 */
export async function verifyPolymartPurchase(license: string, resourceId: string): Promise<{ ok: boolean; error?: string }> {
  const body = new URLSearchParams({ license, resource_id: resourceId });
  const apiKey = getSetting("polymart_api_key");
  if (apiKey) body.set("api_key", apiKey);
  try {
    const res = await fetch(VERIFY_URL, {
      method: "POST",
      body,
      headers: { "User-Agent": "XkixosLicensing/1.0" },
      signal: AbortSignal.timeout(8000),
    });
    const json = (await res.json().catch(() => null)) as { response?: { success?: boolean; result?: { status?: unknown }; errors?: unknown } } | null;
    const response = json?.response;
    if (!response?.success) {
      return { ok: false, error: `Polymart rejected the license (HTTP ${res.status}): ${JSON.stringify(response?.errors ?? json)?.slice(0, 200)}` };
    }
    // Some API actions report the outcome in result.status; treat an explicit false as a failure.
    if (response.result && (response.result.status === false || response.result.status === 0)) {
      return { ok: false, error: "Polymart says this purchase is not valid" };
    }
    return { ok: true };
  } catch (err) {
    return { ok: false, error: `Could not reach Polymart: ${err instanceof Error ? err.message : String(err)}` };
  }
}
