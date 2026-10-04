import { ActionForm, CodeBlock, CopyField, SubmitButton } from "@/components/client";
import { Callout, Card, Field, PageHeader } from "@/components/ui";
import { getAdmin } from "@/lib/auth";
import { getSetting, publicUrl } from "@/lib/settings";
import { publicKeyBase64, publicKeyPem } from "@/lib/signing";
import { changePasswordAction, saveSettingsAction } from "../actions";

export const metadata = { title: "Settings" };

export default function SettingsPage() {
  const saved = getSetting("public_url");
  return (
    <>
      <PageHeader title="Settings" />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Site address" description="The public address of this site. Plugins, BuiltByBit and Tebex use it to reach you.">
          <ActionForm action={saveSettingsAction} className="space-y-4">
            <Field
              label="Public URL"
              hint={
                saved
                  ? "After changing this, re-download XkixosLicense.java and rebuild your plugins. Old builds keep calling the old address."
                  : process.env.PUBLIC_URL
                    ? `Currently taken from the PUBLIC_URL environment variable: ${process.env.PUBLIC_URL}`
                    : "Not set yet. Use https:// once your domain is ready."
              }
            >
              <input name="public_url" className="input" defaultValue={saved ?? ""} placeholder={publicUrl()} />
            </Field>
            <SubmitButton>Save</SubmitButton>
          </ActionForm>
        </Card>

        <Card title="Change password" description={`Logged in as ${getAdmin()?.username}. Changing it logs you out everywhere.`}>
          <ActionForm action={changePasswordAction} className="space-y-4">
            <Field label="Current password">
              <input name="current" type="password" className="input" autoComplete="current-password" required />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="New password">
                <input name="password" type="password" className="input" autoComplete="new-password" required minLength={8} />
              </Field>
              <Field label="Confirm">
                <input name="confirm" type="password" className="input" autoComplete="new-password" required />
              </Field>
            </div>
            <SubmitButton>Change password</SubmitButton>
          </ActionForm>
        </Card>
      </div>

      <Card className="mt-6" title="Signing key" description="Every license answer is signed with this site's private key. Plugins check it with the public key below.">
        <div className="space-y-4">
          <Callout>
            The downloadable Java class already contains this key, so you only need it for custom (non-Minecraft) integrations. The private key never leaves
            the server&apos;s database. Back up the <code>data</code> folder: if you lose the key, every built plugin has to be rebuilt.
          </Callout>
          <Field label="Public key (Base64 / DER), for Java">
            <CopyField value={publicKeyBase64()} />
          </Field>
          <div>
            <div className="mb-1.5 text-sm font-medium">Public key (PEM), for Node.js, Python, etc.</div>
            <CodeBlock code={publicKeyPem().trim()} />
          </div>
        </div>
      </Card>
    </>
  );
}
