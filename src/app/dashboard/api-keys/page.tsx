import Link from "next/link";
import { ActionForm, SubmitButton } from "@/components/client";
import { Card, Field, Mono, PageHeader, Table, Td } from "@/components/ui";
import { db } from "@/lib/db";
import { formatDate, timeAgo } from "@/lib/format";
import { createApiKeyAction, deleteApiKeyAction } from "../actions";

export const metadata = { title: "API keys" };

export default function ApiKeysPage() {
  const keys = db().prepare("SELECT id, name, prefix, created_at, last_used_at FROM api_keys ORDER BY created_at DESC").all() as {
    id: string;
    name: string;
    prefix: string;
    created_at: number;
    last_used_at: number | null;
  }[];
  return (
    <>
      <PageHeader
        title="API keys"
        description={
          <>
            Manage plugins, licenses and the blacklist from your own scripts or bots.{" "}
            <Link className="link" href="/dashboard/guides/rest-api">
              API guide →
            </Link>
          </>
        }
      />
      <div className="grid gap-6 lg:grid-cols-3">
        <Card title="Create an API key">
          <ActionForm action={createApiKeyAction} className="space-y-4" reset>
            <Field label="Name" hint="So you remember what uses it.">
              <input name="name" className="input" placeholder="Discord bot" maxLength={60} />
            </Field>
            <SubmitButton>Create key</SubmitButton>
          </ActionForm>
        </Card>
        <Card title="Your keys" className="lg:col-span-2">
          <Table head={["Name", "Key", "Created", "Last used", ""]} empty="No API keys yet.">
            {keys.map((k) => (
              <tr key={k.id}>
                <Td className="font-medium">{k.name}</Td>
                <Td>
                  <Mono className="text-muted">{k.prefix}…</Mono>
                </Td>
                <Td className="text-muted">{formatDate(k.created_at)}</Td>
                <Td className="text-muted">{timeAgo(k.last_used_at)}</Td>
                <Td className="text-right">
                  <form action={deleteApiKeyAction}>
                    <input type="hidden" name="id" value={k.id} />
                    <SubmitButton variant="ghost" confirm={`Revoke "${k.name}"? Anything using it stops working.`}>
                      Revoke
                    </SubmitButton>
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
