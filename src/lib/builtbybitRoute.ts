import { handleBuiltByBit } from "@/lib/builtbybit";
import { clientIp } from "@/lib/ip";
import { rateLimited } from "@/lib/ratelimit";

/** Shared by /api/builtbybit and /api/builtbybit/<pluginId>. Replies with the key as plain text. */
export async function builtByBitResponse(req: Request, pluginId?: string) {
  if (rateLimited(`bbb:${clientIp(req.headers)}`, 120, 60_000)) return text("Too many requests", 429);
  const fields: Record<string, string> = {};
  try {
    const type = req.headers.get("content-type") || "";
    if (type.includes("application/json")) {
      for (const [k, v] of Object.entries((await req.json()) as Record<string, unknown>)) fields[k] = String(v ?? "");
    } else {
      for (const [k, v] of (await req.formData()).entries()) if (typeof v === "string") fields[k] = v;
    }
  } catch {
    return text("Invalid request body", 400);
  }
  const result = handleBuiltByBit(fields, pluginId);
  return result.ok ? text(result.key, 200) : text(result.error, result.status);
}

function text(body: string, status: number) {
  return new Response(body, {
    status,
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
  });
}
