import { ActionForm, SubmitButton } from "@/components/client";
import { MarketplaceFields } from "@/components/MarketplaceFields";
import { Field } from "@/components/ui";
import { createPluginAction, updatePluginAction } from "@/app/dashboard/actions";
import type { Plugin } from "@/lib/types";

export function PluginForm({ plugin }: { plugin?: Plugin }) {
  return (
    <ActionForm action={plugin ? updatePluginAction : createPluginAction} className="space-y-4">
      {plugin && <input type="hidden" name="id" value={plugin.id} />}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Plugin name">
          <input name="name" className="input" defaultValue={plugin?.name} placeholder="SuperSpawners" required maxLength={80} />
        </Field>
        <Field label="Icon URL (optional)">
          <input name="icon" className="input" defaultValue={plugin?.icon ?? ""} placeholder="https://…/icon.png" />
        </Field>
      </div>
      <MarketplaceFields marketplace={plugin?.marketplace} marketplaceValue={plugin?.marketplace_url || plugin?.marketplace_id || ""} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Default max servers" hint="Used for new keys (incl. marketplace keys). 0 = unlimited.">
          <input name="default_max_ips" type="number" min={0} className="input" defaultValue={plugin?.default_max_ips ?? 1} />
        </Field>
        <Field label="Default license length (days)" hint="0 = lifetime. Used for new keys.">
          <input name="default_duration_days" type="number" min={0} className="input" defaultValue={plugin?.default_duration_days ?? 0} />
        </Field>
      </div>
      <Field label="Description (optional)">
        <input name="description" className="input" defaultValue={plugin?.description ?? ""} maxLength={500} />
      </Field>
      <SubmitButton>{plugin ? "Save plugin" : "Create plugin"}</SubmitButton>
    </ActionForm>
  );
}
