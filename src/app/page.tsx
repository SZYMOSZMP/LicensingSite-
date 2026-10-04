import Link from "next/link";
import { redirect } from "next/navigation";
import { adminExists, isLoggedIn } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function Home() {
  if (!adminExists()) redirect("/setup");
  const loggedIn = await isLoggedIn();
  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-md text-center">
        <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-accent to-accent-2 text-2xl font-bold text-white">X</div>
        <h1 className="text-3xl font-semibold tracking-tight">Xkixos Licensing</h1>
        <p className="mt-2 text-muted">License keys for Minecraft plugins.</p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link href="/check" className="btn-primary">
            Check my license
          </Link>
          <Link href={loggedIn ? "/dashboard" : "/login"} className="btn-secondary">
            {loggedIn ? "Open dashboard" : "Owner login"}
          </Link>
        </div>
      </div>
    </main>
  );
}
