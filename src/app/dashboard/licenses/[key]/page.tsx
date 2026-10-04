import { notFound } from "next/navigation";
import { CopyField, SubmitButton } from "@/components/client";
import { EditLicenseForm } from "@/components/LicenseForms";
import { BackLink, Badge, Card, LicenseState, Mono, PageHeader, StatusBadge, Table, Td } from "@/components/ui";
import { safeDecode } from "@/lib/api";
import { formatDate, formatDateTime, timeAgo } from "@/lib/format";
import { getLicense, licenseSessions, recentChecks } from "@/lib/services";
import { publicUrl } from "@/lib/settings";
import { deleteLicenseAction, resetSessionsAction, toggleLicenseAction } from "../../actions";

export const metadata = { title: "License" };

export default async function LicensePage({ params }: { params: Promise<{ key: string }> }) {
  const key = safeDecode((await params).key);
  const license = getLicense(key);
  if (!license) notFound();
  const sessions = licenseSessions(key);
  const checks = recentChecks({ licenseKey: key, limit: 30 });
  const checkUrl = `${publicUrl()}/check?plugin=${license.plugin_id}`;

  return (
    <>
      <BackLink href={`/dashboard/plugins/${license.plugin_id}`}>{license.plugin_name}</BackLink>
      <PageHeader
        title="License"
        description={license.user ?? "No buyer set"}
        actions={
          <>
            <form action={toggleLicenseAction}>
              <input type="hidden" name="key" value={key} />
              <input type="hidden" name="enabled" value={license.enabled ? "0" : "1"} />
              <SubmitButton variant={license.enabled ? "secondary" : "primary"}>{license.enabled ? "Disable" : "Enable"}</SubmitButton>
            </form>
          </>
        }
      />

      <div className="mb-6 grid gap-4 lg:grid-cols-3">
        <div className="rounded-xl border border-line bg-panel p-4 lg:col-span-2">
          <div className="mb-2 text-xs font-medium uppercase tracking-wide text-muted">License key</div>
          <CopyField value={license.key} />
          <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-sm">
            <span>
              <span className="text-muted">Status </span>
              <LicenseState enabled={license.enabled} expiresAt={license.expires_at} />
            </span>
            <span>
              <span className="text-muted">Expires </span>
              {formatDate(license.expires_at)}
            </span>
            <span>
              <span className="text-muted">Created </span>
              {formatDate(license.created_at)}
            </span>
            <span>
              <span className="text-muted">From </span>
              <Badge color="violet">{license.source}</Badge>
            </span>
          </div>
        </div>
        <div className="rounded-xl border border-line bg-panel p-4">
          <div className="mb-2 text-xs font-medium uppercase tracking-wide text-muted">Buyer self-check link</div>
          <CopyField value={checkUrl} />
          <p className="mt-2 text-xs text-muted">Send this to the buyer so they can check their own license status.</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Edit license">
          <EditLicenseForm license={license} />
        </Card>

        <Card
          title={`Servers online (${sessions.length} / ${license.max_ips === 0 ? "∞" : license.max_ips})`}
          description="Servers that checked this license and sent a heartbeat in the last 90 seconds."
          actions={
            sessions.length > 0 && (
              <form action={resetSessionsAction}>
                <input type="hidden" name="key" value={key} />
                <SubmitButton variant="secondary" confirm="Forget all servers using this license? They keep running, but free slots open up straight away.">
                  Reset servers
                </SubmitButton>
              </form>
            )
          }
        >
          <Table head={["IP", "Started", "Last heartbeat"]} empty="No servers online right now.">
            {sessions.map((s) => (
              <tr key={s.session_id}>
                <Td>
                  <Mono>{s.ip}</Mono>
                </Td>
                <Td className="text-muted">{timeAgo(s.started_at)}</Td>
                <Td className="text-muted">{timeAgo(s.last_seen)}</Td>
              </tr>
            ))}
          </Table>
        </Card>
      </div>

      <Card className="mt-6" title="Recent checks">
        <Table head={["Time", "IP", "Result"]} empty="This license has never been checked.">
          {checks.map((c) => (
            <tr key={c.id}>
              <Td className="whitespace-nowrap text-muted">{formatDateTime(c.created_at)}</Td>
              <Td>
                <Mono>{c.ip}</Mono>
              </Td>
              <Td>
                <StatusBadge status={c.status} />
              </Td>
            </tr>
          ))}
        </Table>
      </Card>

      <Card className="mt-6 border-bad/30" title="Danger zone">
        <form action={deleteLicenseAction} className="flex flex-wrap items-center justify-between gap-3">
          <input type="hidden" name="key" value={key} />
          <input type="hidden" name="back" value={`/dashboard/plugins/${license.plugin_id}`} />
          <p className="text-sm text-muted">Deleting removes the key for good. To block it temporarily, use Disable instead.</p>
          <SubmitButton variant="danger" confirm="Delete this license? This cannot be undone.">
            Delete license
          </SubmitButton>
        </form>
      </Card>
    </>
  );
}
