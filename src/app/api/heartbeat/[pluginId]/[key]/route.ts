import { json, safeDecode } from "@/lib/api";
import { clientIp } from "@/lib/ip";
import { rateLimited } from "@/lib/ratelimit";
import { heartbeat } from "@/lib/validation";

export const dynamic = "force-dynamic";

/** POST /api/heartbeat/{pluginId}/{key}  body: {"sessionId": "...", "shutdown": false} */
export async function POST(req: Request, ctx: { params: Promise<{ pluginId: string; key: string }> }) {
  const { pluginId, key } = await ctx.params;
  const ip = clientIp(req.headers);
  if (rateLimited(`heartbeat:${ip}`, 240, 60_000)) return json({ ok: false }, 429);
  const body = (await req.json().catch(() => ({}))) as { sessionId?: unknown; serverIp?: unknown; shutdown?: unknown };
  const sessionId = String(body.sessionId ?? body.serverIp ?? "");
  const ok = heartbeat(safeDecode(pluginId), safeDecode(key), sessionId, ip, body.shutdown === true);
  return json({ ok }, ok ? 200 : 404);
}
