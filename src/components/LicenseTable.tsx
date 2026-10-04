import Link from "next/link";
import { Badge, LicenseState, Mono, Table, Td } from "@/components/ui";
import { formatDate, timeAgo } from "@/lib/format";
import type { LicenseWithStats } from "@/lib/types";

const SOURCE_LABEL: Record<string, string> = {
  manual: "Manual",
  api: "API",
  builtbybit: "BuiltByBit",
  polymart: "Polymart",
  tebex: "Tebex",
};

export function LicenseTable({ licenses, showPlugin = false, empty }: { licenses: LicenseWithStats[]; showPlugin?: boolean; empty?: React.ReactNode }) {
  return (
    <Table head={["Key", ...(showPlugin ? ["Plugin"] : []), "Buyer", "Status", "Servers", "Expires", "Last check", "From"]} empty={empty}>
      {licenses.map((l) => (
        <tr key={l.key} className="hover:bg-panel-2/50">
          <Td>
            <Link href={`/dashboard/licenses/${encodeURIComponent(l.key)}`} className="font-mono text-xs text-accent-2 hover:underline">
              {l.key.length > 20 ? `${l.key.slice(0, 18)}…` : l.key}
            </Link>
          </Td>
          {showPlugin && (
            <Td>
              <Link href={`/dashboard/plugins/${l.plugin_id}`} className="hover:underline">
                {l.plugin_name}
              </Link>
            </Td>
          )}
          <Td className="max-w-[180px] truncate">{l.user || <span className="text-muted">—</span>}</Td>
          <Td>
            <LicenseState enabled={l.enabled} expiresAt={l.expires_at} />
          </Td>
          <Td className="tabular-nums">
            {l.active_servers} / {l.max_ips === 0 ? "∞" : l.max_ips}
          </Td>
          <Td className="whitespace-nowrap">{formatDate(l.expires_at)}</Td>
          <Td className="whitespace-nowrap text-muted">{timeAgo(l.last_validated_at)}</Td>
          <Td>
            <Badge color={l.source === "manual" ? "gray" : "violet"}>{SOURCE_LABEL[l.source] ?? l.source}</Badge>
          </Td>
        </tr>
      ))}
    </Table>
  );
}

export function Pager({ total, limit, offset, base }: { total: number; limit: number; offset: number; base: string }) {
  if (total <= limit) return null;
  const sep = base.includes("?") ? "&" : "?";
  return (
    <div className="mt-4 flex items-center justify-between text-sm text-muted">
      <span>
        {offset + 1}–{Math.min(offset + limit, total)} of {total}
      </span>
      <div className="flex gap-2">
        {offset > 0 && (
          <Link className="btn-secondary" href={`${base}${sep}offset=${Math.max(0, offset - limit)}`}>
            Previous
          </Link>
        )}
        {offset + limit < total && (
          <Link className="btn-secondary" href={`${base}${sep}offset=${offset + limit}`}>
            Next
          </Link>
        )}
      </div>
    </div>
  );
}
