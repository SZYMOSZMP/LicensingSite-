import { json } from "@/lib/api";
import { lookupForBuyer } from "@/lib/check";
import { clientIp } from "@/lib/ip";
import { rateLimited } from "@/lib/ratelimit";

export const dynamic = "force-dynamic";

/** Public license lookup for buyers: GET /api/check?pluginId=...&key=... */
export async function GET(req: Request) {
  if (rateLimited(`check:${clientIp(req.headers)}`, 20, 60_000)) return json({ error: "Too many lookups, wait a minute" }, 429);
  const url = new URL(req.url);
  const result = lookupForBuyer(url.searchParams.get("pluginId") || "", url.searchParams.get("key") || "");
  return json(result, result.found ? 200 : 404);
}
