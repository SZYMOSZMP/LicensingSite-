import { ActionForm, SubmitButton } from "@/components/client";
import { Field } from "@/components/ui";
import { createLicenseAction, updateLicenseAction } from "@/app/dashboard/actions";
import { dateInputValue } from "@/lib/format";
import type { License, Plugin } from "@/lib/types";

const DAY = 86_400_000;

export function CreateLicenseForm({ plugin }: { plugin: Plugin }) {
  const defaultExpiry = plugin.default_duration_days > 0 ? dateInputValue(Date.now() + plugin.default_duration_days * DAY) : "";
  return (
    <ActionForm action={createLicenseAction} className="space-y-4" reset>
      <input type="hidden" name="plugin_id" value={plugin.id} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Buyer" hint="Name, Discord or email. Just for you to recognise them.">
          <input name="user" className="input" placeholder="Steve#1234" />
        </Field>
        <Field label="Max servers" hint="How many different server IPs can run it at once. 0 = unlimited.">
          <input name="max_ips" type="number" min={0} className="input" defaultValue={plugin.default_max_ips} />
        </Field>
        <Field label="Expires" hint="Leave empty for a lifetime license.">
          <input name="expires_at" type="date" className="input" defaultValue={defaultExpiry} />
        </Field>
        <Field label="How many keys" hint="Create several identical keys at once.">
          <input name="count" type="number" min={1} max={100} className="input" defaultValue={1} />
        </Field>
        <Field label="Custom key (optional)" hint="Leave empty to generate a random key.">
          <input name="key" className="input font-mono" placeholder="auto-generated" />
        </Field>
        <Field label="Note (optional)">
          <input name="note" className="input" placeholder="Paid via PayPal" />
        </Field>
      </div>
      <SubmitButton>Create license</SubmitButton>
    </ActionForm>
  );
}

export function EditLicenseForm({ license }: { license: License }) {
  return (
    <ActionForm action={updateLicenseAction} className="space-y-4">
      <input type="hidden" name="key" value={license.key} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Buyer">
          <input name="user" className="input" defaultValue={license.user ?? ""} />
        </Field>
        <Field label="Max servers" hint="0 = unlimited">
          <input name="max_ips" type="number" min={0} className="input" defaultValue={license.max_ips} />
        </Field>
        <Field label="Expires" hint="Leave empty for never.">
          <input name="expires_at" type="date" className="input" defaultValue={dateInputValue(license.expires_at)} />
        </Field>
        <Field label="Note">
          <input name="note" className="input" defaultValue={license.note ?? ""} />
        </Field>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="enabled" defaultChecked={!!license.enabled} className="h-4 w-4 accent-[var(--color-accent)]" />
        Enabled (untick to block this key everywhere)
      </label>
      <SubmitButton>Save changes</SubmitButton>
    </ActionForm>
  );
}
