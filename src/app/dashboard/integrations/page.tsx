import Link from "next/link";
import { ActionForm, CopyField, SubmitButton } from "@/components/client";
import { Badge, Callout, Card, Field, PageHeader } from "@/components/ui";
import { DEFAULT_BODY, DEFAULT_SUBJECT, smtpConfigured } from "@/lib/mail";
import { timeAgo } from "@/lib/format";
import { listPlugins, recentEvents } from "@/lib/services";
import { getSetting, publicUrl } from "@/lib/settings";
import type { Marketplace } from "@/lib/types";
import { generateBbbSecretAction, saveSettingsAction, testEmailAction } from "../actions";

export const metadata = { title: "Integrations" };

export default function IntegrationsPage() {
  const base = publicUrl();
  const bbbSecret = getSetting("bbb_secret");
  const hasPolymartKey = !!getSetting("polymart_api_key");
  const hasTebexSecret = !!getSetting("tebex_secret");
  const plugins = listPlugins();
  const linked = (m: Marketplace) => plugins.filter((p) => p.marketplace === m);
  const events = recentEvents(25);
  const local = base.includes("localhost") || base.includes("127.0.0.1");

  return (
    <>
      <PageHeader title="Integrations" description="Give buyers their license key automatically when they buy your plugin." />

      {local && (
        <div className="mb-6">
          <Callout tone="warn">
            Your site address is <code>{base}</code>. Marketplaces can&apos;t reach that, so set your real public https address in{" "}
            <Link className="link" href="/dashboard/settings">
              Settings
            </Link>{" "}
            first. The URLs below update automatically.
          </Callout>
        </div>
      )}

      {/* ------------------------------------------------------------ BuiltByBit */}
      <div id="builtbybit" className="scroll-mt-6">
        <Card
          title={
            <span className="flex items-center gap-2">
              BuiltByBit {bbbSecret ? <Badge color="green">Connected</Badge> : <Badge>Not set up</Badge>}
            </span>
          }
          description="Every download of your premium resource gets its own license key baked into the jar."
        >
          <ol className="space-y-6">
            <Step n={1} title="Generate a secret">
              <p className="mb-3 text-sm text-muted">BuiltByBit sends this with every request so nobody else can make keys.</p>
              {bbbSecret && (
                <div className="mb-3">
                  <CopyField value={bbbSecret} />
                </div>
              )}
              <ActionForm action={generateBbbSecretAction}>
                <SubmitButton variant={bbbSecret ? "secondary" : "primary"} confirm={bbbSecret ? "Make a new secret? You'll have to paste it into BuiltByBit again." : undefined}>
                  {bbbSecret ? "Generate a new secret" : "Generate secret"}
                </SubmitButton>
              </ActionForm>
            </Step>

            <Step n={2} title="Create the placeholder on BuiltByBit">
              <p className="mb-3 text-sm text-muted">
                Open{" "}
                <a className="link" href="https://builtbybit.com/placeholders/" target="_blank" rel="noreferrer">
                  builtbybit.com/placeholders
                </a>
                , click <strong>Create placeholder</strong> and fill in exactly this:
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Placeholder">
                  <CopyField value="%%__BBB_LICENSE__%%" />
                </Field>
                <Field label="Type">
                  <input readOnly className="input" value="External license key" />
                </Field>
                <Field label="URL">
                  <CopyField value={`${base}/api/builtbybit`} />
                </Field>
                <Field label="Secret">
                  <CopyField value={bbbSecret ?? "Generate a secret in step 1 first"} />
                </Field>
              </div>
            </Step>

            <Step n={3} title="Link your plugin to the resource">
              <p className="text-sm text-muted">
                On the{" "}
                <Link className="link" href="/dashboard/plugins">
                  Plugins
                </Link>{" "}
                page, create (or edit) the plugin, choose <strong>BuiltByBit</strong> under &quot;Sold on&quot; and paste your resource link.
              </p>
              <LinkedPlugins plugins={linked("builtbybit")} />
            </Step>

            <Step n={4} title="Add the license check and upload">
              <p className="text-sm text-muted">
                Add the license class to your plugin as normal (see the plugin&apos;s page), build it, and upload the jar to BuiltByBit. The class already contains{" "}
                <code>%%__BBB_LICENSE__%%</code>, so you don&apos;t have to add anything else. Buyers never need to paste a key.
              </p>
            </Step>
          </ol>
        </Card>
      </div>

      {/* ------------------------------------------------------------ Polymart */}
      <div id="polymart" className="mt-6 scroll-mt-6">
        <Card
          title={
            <span className="flex items-center gap-2">
              Polymart (Voxel Shop) {linked("polymart").length ? <Badge color="green">{linked("polymart").length} linked</Badge> : <Badge>Not set up</Badge>}
            </span>
          }
          description="Polymart bakes a license into every download. The first time the plugin starts, it's checked with Polymart and turned into a normal key."
        >
          <ol className="space-y-6">
            <Step n={1} title="Add your Polymart API key">
              <p className="mb-3 text-sm text-muted">
                Get it from your Polymart account settings (API keys). It&apos;s used to confirm purchases with Polymart.
                {hasPolymartKey && <span className="text-ok"> A key is saved.</span>}
              </p>
              <ActionForm action={saveSettingsAction} className="flex flex-col gap-2 sm:flex-row">
                <input name="polymart_api_key" type="password" className="input sm:max-w-md" placeholder={hasPolymartKey ? "•••••••• (leave empty to keep)" : "Polymart API key"} autoComplete="off" />
                <SubmitButton>Save</SubmitButton>
              </ActionForm>
            </Step>
            <Step n={2} title="Link your plugin to the resource">
              <p className="text-sm text-muted">
                Create or edit the plugin, choose <strong>Polymart</strong> under &quot;Sold on&quot;, and paste your resource link.
              </p>
              <LinkedPlugins plugins={linked("polymart")} />
            </Step>
            <Step n={3} title="Add the license check and upload">
              <p className="text-sm text-muted">
                Add the license class as normal and upload the jar to Polymart. The class already contains Polymart&apos;s <code>%%__POLYMART__%%</code>,{" "}
                <code>%%__LICENSE__%%</code> and <code>%%__USER__%%</code> placeholders, which Polymart fills in on download.
              </p>
            </Step>
          </ol>
        </Card>
      </div>

      {/* ------------------------------------------------------------ Tebex */}
      <div id="tebex" className="mt-6 scroll-mt-6">
        <Card
          title={
            <span className="flex items-center gap-2">
              Tebex {hasTebexSecret ? <Badge color="green">Connected</Badge> : <Badge>Not set up</Badge>}
              {hasTebexSecret && !smtpConfigured() && <Badge color="amber">Email not set up</Badge>}
            </span>
          }
          description="When someone pays in your Tebex store, a key is created and emailed to them. Refunds and chargebacks disable the key."
        >
          <ol className="space-y-6">
            <Step n={1} title="Add the webhook in Tebex">
              <p className="mb-3 text-sm text-muted">
                Open{" "}
                <a className="link" href="https://creator.tebex.io/webhooks" target="_blank" rel="noreferrer">
                  creator.tebex.io/webhooks
                </a>
                , click <strong>Add endpoint</strong>, paste this URL and tick <strong>payment.completed</strong> (also tick <strong>payment.refunded</strong> and{" "}
                <strong>payment.dispute.opened</strong> to auto-disable keys).
              </p>
              <CopyField value={`${base}/api/tebex`} />
            </Step>
            <Step n={2} title="Paste your Tebex webhook secret">
              <p className="mb-3 text-sm text-muted">
                It&apos;s shown on the same Tebex webhooks page. {hasTebexSecret && <span className="text-ok">A secret is saved.</span>}
              </p>
              <ActionForm action={saveSettingsAction} className="flex flex-col gap-2 sm:flex-row">
                <input name="tebex_secret" type="password" className="input sm:max-w-md" placeholder={hasTebexSecret ? "•••••••• (leave empty to keep)" : "Tebex webhook secret"} autoComplete="off" />
                <SubmitButton>Save</SubmitButton>
              </ActionForm>
              <p className="mt-2 text-xs text-muted">Save the secret before Tebex sends its validation request, otherwise adding the endpoint fails.</p>
            </Step>
            <Step n={3} title="Link your plugin to the package">
              <p className="text-sm text-muted">
                Create or edit the plugin, choose <strong>Tebex</strong> under &quot;Sold on&quot;, and enter the Tebex package ID.
              </p>
              <LinkedPlugins plugins={linked("tebex")} />
            </Step>
            <Step n={4} title="Set up email so buyers receive their key">
              <p className="mb-3 text-sm text-muted">
                Any SMTP provider works (Gmail with an app password, Zoho, Brevo, Resend, Mailgun...). Without this, keys are still created and show up in your
                dashboard, but nobody gets emailed.
              </p>
              <ActionForm action={saveSettingsAction} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-3">
                  <Field label="SMTP host" className="sm:col-span-2">
                    <input name="smtp_host" className="input" defaultValue={getSetting("smtp_host") ?? ""} placeholder="smtp.gmail.com" />
                  </Field>
                  <Field label="Port">
                    <input name="smtp_port" className="input" defaultValue={getSetting("smtp_port") ?? "587"} />
                  </Field>
                  <Field label="Username">
                    <input name="smtp_user" className="input" defaultValue={getSetting("smtp_user") ?? ""} autoComplete="off" />
                  </Field>
                  <Field label="Password">
                    <input
                      name="smtp_pass"
                      type="password"
                      className="input"
                      placeholder={getSetting("smtp_pass") ? "•••••••• (leave empty to keep)" : ""}
                      autoComplete="new-password"
                    />
                  </Field>
                  <Field label="From address">
                    <input name="smtp_from" className="input" defaultValue={getSetting("smtp_from") ?? ""} placeholder="Xkixos <you@gmail.com>" />
                  </Field>
                </div>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" name="smtp_secure_check" defaultChecked={getSetting("smtp_secure") === "true"} className="h-4 w-4" />
                  Use SSL/TLS from the start (port 465). Leave off for port 587.
                </label>
                <Field label="Email subject" hint="You can use {plugin}, {name}, {keys} and {checkUrl}.">
                  <input name="email_subject" className="input" defaultValue={getSetting("email_subject") ?? DEFAULT_SUBJECT} />
                </Field>
                <Field label="Email text">
                  <textarea name="email_body" rows={10} className="input font-mono text-xs" defaultValue={getSetting("email_body") ?? DEFAULT_BODY} />
                </Field>
                <SubmitButton>Save email settings</SubmitButton>
              </ActionForm>
              <ActionForm action={testEmailAction} className="mt-4 flex flex-col gap-2 border-t border-line pt-4 sm:flex-row">
                <input name="to" type="email" className="input sm:max-w-xs" placeholder="you@example.com" required />
                <SubmitButton variant="secondary">Send test email</SubmitButton>
              </ActionForm>
            </Step>
          </ol>
        </Card>
      </div>

      <Card className="mt-6" title="Integration log" description="What the marketplaces have sent recently. Look here if something isn't working.">
        {events.length === 0 ? (
          <p className="text-sm text-muted">No events yet.</p>
        ) : (
          <ul className="divide-y divide-line text-sm">
            {events.map((e) => (
              <li key={e.id} className="flex flex-col gap-1 py-2 sm:flex-row sm:gap-4">
                <span className="w-28 shrink-0 text-xs text-muted">{timeAgo(e.created_at)}</span>
                <span className="w-24 shrink-0 text-xs font-medium uppercase tracking-wide text-muted">{e.kind}</span>
                <span className="min-w-0 break-words">{e.message}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <li className="flex gap-4">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent/20 text-sm font-semibold text-accent-2">{n}</span>
      <div className="min-w-0 flex-1">
        <h3 className="mb-1 font-semibold">{title}</h3>
        {children}
      </div>
    </li>
  );
}

function LinkedPlugins({ plugins }: { plugins: { id: string; name: string; marketplace_id: string | null }[] }) {
  if (!plugins.length) return <p className="mt-2 text-xs text-warn">No plugins linked yet.</p>;
  return (
    <ul className="mt-2 flex flex-wrap gap-2">
      {plugins.map((p) => (
        <li key={p.id}>
          <Link href={`/dashboard/plugins/${p.id}`} className="inline-flex items-center gap-1.5 rounded-md border border-ok/30 bg-ok/10 px-2 py-1 text-xs text-ok hover:bg-ok/20">
            ✓ {p.name} <span className="text-ok/70">#{p.marketplace_id}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
