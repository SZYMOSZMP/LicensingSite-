import { json, safeDecode } from "@/lib/api";
import { clientIp } from "@/lib/ip";
import { rateLimited } from "@/lib/ratelimit";
import { sign, signedPayload } from "@/lib/signing";
import { STATUS_MESSAGES, type ValidationStatus } from "@/lib/types";
import { validateLicense } from "@/lib/validation";

export const dynamic = "force-dynamic";

/**
 * GET /api/validate/{pluginId}/{key}?sessionId=<uuid>&nonce=<uuid>[&polymartUserId=<id>]
 * Always answers 200 with a signed body so the plugin can show the real reason.
 */
export async function GET(req: Request, ctx: { params: Promise<{ pluginId: string; key: string }> }) {
  const { pluginId: rawPluginId, key: rawKey } = await ctx.params;
  const url = new URL(req.url);
  const pluginId = safeDecode(rawPluginId).slice(0, 64);
  const key = safeDecode(rawKey).slice(0, 64);
  const nonce = (url.searchParams.get("nonce") || "").slice(0, 64);
  const sessionId = (url.searchParams.get("sessionId") || "").slice(0, 64);
  const ip = clientIp(req.headers);

  let status: ValidationStatus;
  let message: string;
  if (rateLimited(`validate:${ip}`, 60, 60_000)) {
    status = "rate_limited";
    message = STATUS_MESSAGES.rate_limited;
  } else {
    try {
      ({ status, message } = await validateLicense({
        pluginId,
        key,
        sessionId,
        nonce,
        ip,
        polymartUserId: url.searchParams.get("polymartUserId"),
      }));
    } catch (err) {
      console.error("validate failed", err);
      status = "server_error";
      message = STATUS_MESSAGES.server_error;
    }
  }

  const signature = sign(signedPayload({ pluginId, key, status, nonce }));
  return json({ pluginId, key, status, message, nonce, signature });
}
