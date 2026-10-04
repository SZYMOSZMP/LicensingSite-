import { ActionForm, SubmitButton } from "@/components/client";
import { Card, Field, Mono, PageHeader, Table, Td } from "@/components/ui";
import { formatDate } from "@/lib/format";
import { listBlacklist } from "@/lib/services";
import { addBlacklistAction, removeBlacklistAction } from "../actions";

export const metadata = { title: "Blacklist" };

export default function BlacklistPage() {
  const entries = listBlacklist();
  return (
    <>
      <PageHeader title="Blacklist" description="Blocked server IPs can't use any of your licenses, even valid ones." />
      <div className="grid gap-6 lg:grid-cols-3">
        <Card title="Block an IP" className="lg:col-span-1">
          <ActionForm action={addBlacklistAction} className="space-y-4" reset>
            <Field label="Server IP" hint="Find IPs on a license page or in the check log.">
              <input name="ip" className="input font-mono" placeholder="203.0.113.7" required />
            </Field>
            <Field label="Reason (optional)">
              <input name="reason" className="input" placeholder="Leaked the plugin" />
            </Field>
            <SubmitButton>Block IP</SubmitButton>
          </ActionForm>
        </Card>
        <Card title={`Blocked IPs (${entries.length})`} className="lg:col-span-2">
          <Table head={["IP", "Reason", "Added", ""]} empty="No blocked IPs.">
            {entries.map((e) => (
              <tr key={e.id}>
                <Td>
                  <Mono>{e.ip}</Mono>
                </Td>
                <Td className="text-muted">{e.reason || "—"}</Td>
                <Td className="whitespace-nowrap text-muted">{formatDate(e.created_at)}</Td>
                <Td className="text-right">
                  <form action={removeBlacklistAction}>
                    <input type="hidden" name="id" value={e.id} />
                    <SubmitButton variant="ghost">Unblock</SubmitButton>
                  </form>
                </Td>
              </tr>
            ))}
          </Table>
        </Card>
      </div>
    </>
  );
}
