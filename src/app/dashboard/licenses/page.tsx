import Link from "next/link";
import { LicenseTable, Pager } from "@/components/LicenseTable";
import { Card, PageHeader } from "@/components/ui";
import { listLicenses, listPlugins } from "@/lib/services";

export const metadata = { title: "Licenses" };

export default async function LicensesPage({ searchParams }: { searchParams: Promise<{ q?: string; plugin?: string; offset?: string }> }) {
  const { q, plugin, offset: rawOffset } = await searchParams;
  const plugins = listPlugins();
  const offset = Math.max(Number(rawOffset) || 0, 0);
  const limit = 50;
  const { rows, total } = listLicenses({ q, pluginId: plugin || undefined, limit, offset });
  const base = `/dashboard/licenses?${new URLSearchParams({ ...(q ? { q } : {}), ...(plugin ? { plugin } : {}) })}`;

  return (
    <>
      <PageHeader title="Licenses" description="Every license key across all your plugins." />
      <Card
        title={`${total} license${total === 1 ? "" : "s"}`}
        actions={
          <form className="flex flex-wrap gap-2">
            <select name="plugin" defaultValue={plugin ?? ""} className="input w-44">
              <option value="">All plugins</option>
              {plugins.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            <input name="q" defaultValue={q} className="input w-56" placeholder="Search key, buyer, note…" />
            <button className="btn-secondary">Filter</button>
          </form>
        }
      >
        <LicenseTable
          licenses={rows}
          showPlugin
          empty={
            plugins.length === 0 ? (
              <>
                Create a{" "}
                <Link className="link" href="/dashboard/plugins">
                  plugin
                </Link>{" "}
                first, then add licenses to it.
              </>
            ) : (
              "No licenses found."
            )
          }
        />
      </Card>
      <Pager total={total} limit={limit} offset={offset} base={base} />
    </>
  );
}
