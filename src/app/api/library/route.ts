import { isLoggedIn } from "@/lib/auth";
import { DEFAULT_PACKAGE, JAVA_PACKAGE_RE, renderJavaLibrary } from "@/lib/javaLibrary";

export const dynamic = "force-dynamic";

/** Downloads XkixosLicense.java with this server's URL and public key filled in. */
export async function GET(req: Request) {
  if (!(await isLoggedIn())) return new Response("Log in first", { status: 401 });
  const pkg = new URL(req.url).searchParams.get("package")?.trim() || DEFAULT_PACKAGE;
  if (!JAVA_PACKAGE_RE.test(pkg)) return new Response("Invalid package name, use something like me.you.myplugin.license", { status: 400 });
  return new Response(renderJavaLibrary(pkg), {
    headers: {
      "Content-Type": "text/x-java-source; charset=utf-8",
      "Content-Disposition": 'attachment; filename="XkixosLicense.java"',
      "Cache-Control": "no-store",
    },
  });
}
