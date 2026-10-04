import { Sidebar } from "@/components/Sidebar";
import { requireAdmin } from "@/lib/auth";
import { logoutAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  return (
    <div className="md:flex">
      <Sidebar logout={logoutAction} />
      <main className="min-w-0 flex-1 px-4 py-6 sm:px-8 sm:py-8">
        <div className="mx-auto max-w-6xl">{children}</div>
      </main>
    </div>
  );
}
