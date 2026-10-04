import Link from "next/link";
import { Card, Mono, PageHeader, StatusBadge, Table, Td } from "@/components/ui";
import { formatDateTime } from "@/lib/format";
import { listPlugins, recentChecks } from "@/lib/services";
import { STATUS_MESSAGES, type ValidationStatus } from "@/lib/types";

export const metadata = { title: "Check log" };

export default async function ChecksPage({ searchParams }: { searchParams: Promise<{ plugin?: string; status?: string }> }) {
  const { plugin, status } = await searchParams;
  const checks = recentChecks({ pluginId: plugin || undefined, status, limit: 300 });
  const plugins = listPlugins();
  return (
    <>
      <PageHeader title="Check log" description="Every time a server started one of your plugins. Kept for 90 days." />
      <Card
        title="Latest 300 checks"
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
            <select name="status" defaultValue={status ?? ""} className="input w-36">
              <option value="">All results</option>
              <option value="valid">Valid</option>
              <option value="rejected">Rejected</option>
            </select>
            <button className="btn-secondary">Filter</button>
          </form>
        }
      >
        <Table head={["Time", "Plugin", "License key", "IP", "Result"]} empty="No checks yet.">
          {checks.map((c) => (
            <tr key={c.id}>
              <Td className="whitespace-nowrap text-muted">{formatDateTime(c.created_at)}</Td>
              <Td>{c.plugin_name ? <Link href={`/dashboard/plugins/${c.plugin_id}`} className="hover:underline">{c.plugin_name}</Link> : <Mono className="text-muted">{c.plugin_id}</Mono>}</Td>
              <Td>
                <Link href={`/dashboard/licenses/${encodeURIComponent(c.license_key)}`} className="font-mono text-xs text-accent-2 hover:underline">
                  {c.license_key.length > 20 ? `${c.license_key.slice(0, 18)}…` : c.license_key}
                </Link>
              </Td>
              <Td>
                <Mono>{c.ip}</Mono>
              </Td>
              <Td>
                <span title={STATUS_MESSAGES[c.status as ValidationStatus]}>
                  <StatusBadge status={c.status} />
                </span>
              </Td>
            </tr>
          ))}
        </Table>
      </Card>
    </>
  );
}
