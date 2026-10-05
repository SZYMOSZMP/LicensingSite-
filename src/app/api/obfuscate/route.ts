import { isLoggedIn } from "@/lib/auth";
import { logEvent } from "@/lib/db";
import { obfuscateJar } from "@/lib/obfuscate";
import { UserError } from "@/lib/types";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/** Obfuscates an uploaded plugin jar and streams back the rewritten jar. */
export async function POST(req: Request) {
  if (!(await isLoggedIn())) return json({ error: "Log in first" }, 401);
  try {
    const form = await req.formData();
    const file = form.get("jar");
    if (!(file instanceof File)) return json({ error: "Attach a .jar file" }, 400);

    const input = Buffer.from(await file.arrayBuffer());
    const { jar, meta } = await obfuscateJar(input);
    logEvent("obfuscate", `Obfuscated ${meta.name || file.name || "a jar"}`);

    return new Response(new Uint8Array(jar), {
      headers: {
        "Content-Type": "application/java-archive",
        "Content-Disposition": `attachment; filename="${obfuscatedName(file.name)}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    if (err instanceof UserError) return json({ error: err.message }, err.status);
    console.error(err);
    return json({ error: "Obfuscation failed. Check the server logs." }, 500);
  }
}

export function obfuscatedName(original: string | undefined): string {
  const base = (original || "plugin.jar").replace(/[^A-Za-z0-9._-]/g, "_").replace(/\.jar$/i, "");
  return `${base || "plugin"}-obfuscated.jar`;
}

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}
