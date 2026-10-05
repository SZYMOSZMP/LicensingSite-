import { isLoggedIn } from "@/lib/auth";
import { logEvent } from "@/lib/db";
import { obfuscateJar } from "@/lib/obfuscate";
import { createLicense, createPlugin } from "@/lib/services";
import { publicUrl } from "@/lib/settings";
import { UserError } from "@/lib/types";
import { obfuscatedName } from "../obfuscate/route";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * One-shot setup: take a jar, obfuscate it, and in the same step register a plugin and mint a
 * license key for it. Returns the obfuscated jar; the new plugin ID and license key come back in
 * response headers so the dashboard can show them.
 */
export async function POST(req: Request) {
  if (!(await isLoggedIn())) return json({ error: "Log in first" }, 401);
  try {
    const form = await req.formData();
    const file = form.get("jar");
    if (!(file instanceof File)) return json({ error: "Attach a .jar file" }, 400);

    const input = Buffer.from(await file.arrayBuffer());

    // Obfuscate first so a bad jar fails before we create anything in the database.
    const { jar, meta } = await obfuscateJar(input);

    const name = str(form.get("name")) || meta.name || file.name.replace(/\.jar$/i, "") || "New plugin";
    const marketplace = str(form.get("marketplace")) || "none";
    const marketplaceId = str(form.get("marketplace_id"));

    const plugin = createPlugin({
      name,
      marketplace,
      marketplace_id: marketplaceId,
      default_max_ips: str(form.get("default_max_ips")) || undefined,
      default_duration_days: str(form.get("default_duration_days")) || undefined,
    });
    const license = createLicense(plugin.id, {
      user: str(form.get("user")) || undefined,
      note: str(form.get("note")) || "Created by Auto setup",
    });

    logEvent("auto_setup", `Auto setup: ${name} (${plugin.id}), license ${license.key}`);

    return new Response(new Uint8Array(jar), {
      headers: {
        "Content-Type": "application/java-archive",
        "Content-Disposition": `attachment; filename="${obfuscatedName(file.name)}"`,
        "Cache-Control": "no-store",
        "X-Plugin-Id": plugin.id,
        "X-Plugin-Name": encodeURIComponent(name),
        "X-License-Key": license.key,
        "X-Public-Url": publicUrl(),
      },
    });
  } catch (err) {
    if (err instanceof UserError) return json({ error: err.message }, err.status);
    console.error(err);
    return json({ error: "Auto setup failed. Check the server logs." }, 500);
  }
}

function str(v: FormDataEntryValue | null): string {
  return typeof v === "string" ? v.trim() : "";
}

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}
