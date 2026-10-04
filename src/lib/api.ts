import { NextResponse } from "next/server";
import { db } from "./db";
import { sha256 } from "./ids";
import { UserError } from "./types";

export function json(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

export function apiKeyValid(headers: Headers): boolean {
  const auth = headers.get("authorization");
  const key = headers.get("x-api-key") || (auth?.toLowerCase().startsWith("bearer ") ? auth.slice(7).trim() : null);
  if (!key || !key.startsWith("xkl_")) return false;
  const row = db().prepare("SELECT id FROM api_keys WHERE key_hash = ?").get(sha256(key)) as { id: string } | undefined;
  if (!row) return false;
  db().prepare("UPDATE api_keys SET last_used_at = ? WHERE id = ?").run(Date.now(), row.id);
  return true;
}

type Handler<P> = (req: Request, params: P) => Promise<Response> | Response;

/** Wraps a REST API route: checks the API key and turns thrown errors into JSON. */
export function apiRoute<P = Record<string, never>>(handler: Handler<P>) {
  return async (req: Request, ctx: { params: Promise<P> }) => {
    if (!apiKeyValid(req.headers)) {
      return json({ error: "Missing or invalid API key. Send it as the X-API-Key header." }, 401);
    }
    try {
      return await handler(req, await ctx.params);
    } catch (err) {
      if (err instanceof UserError) return json({ error: err.message }, err.status);
      console.error(err);
      return json({ error: "Internal server error" }, 500);
    }
  };
}

export async function readJson(req: Request): Promise<Record<string, unknown>> {
  try {
    const body = await req.json();
    if (body && typeof body === "object" && !Array.isArray(body)) return body as Record<string, unknown>;
  } catch {
    // fall through
  }
  throw new UserError("Request body must be a JSON object");
}

/** decodeURIComponent that never throws (route params may already be decoded). */
export function safeDecode(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}
