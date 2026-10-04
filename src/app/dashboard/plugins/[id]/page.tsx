import Link from "next/link";
import { notFound } from "next/navigation";
import { ChecksChart } from "@/components/ChecksChart";
import { CopyField, SubmitButton } from "@/components/client";
import { CreateLicenseForm } from "@/components/LicenseForms";
import { LicenseTable, Pager } from "@/components/LicenseTable";
import { PluginForm } from "@/components/PluginForm";
import { PluginSetup } from "@/components/PluginSetup";
import { BackLink, Badge, Callout, Card, PageHeader, PluginIcon, Stat } from "@/components/ui";
import { dailyChecks, getPlugin, listLicenses } from "@/lib/services";
import { getSetting, publicUrl } from "@/lib/settings";
import { MARKETPLACE_LABELS } from "@/lib/types";
import { deletePluginAction } from "../../actions";

export default async function PluginPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ q?: string; offset?: string; created?: string }>;
}) {
  const { id } = await params;
  const { q, offset: rawOffset, created } = await searchParams;
  const plugin = getPlugin(id);
  if (!plugin) notFound();
  const offset = Math.max(Number(rawOffset) || 0, 0);
  const limit = 25;
  const { rows, total } = listLicenses({ pluginId: id, q, limit, offset });
  const chart = dailyChecks(14, id);
  const checks14d = chart.reduce((a, d) => a + d.valid + d.rejected, 0);

  return (
    <>
      <BackLink href="/dashboard/plugins">Plugins</BackLink>
      <PageHeader
        title={
          <span className="flex items-center gap-3">
            <PluginIcon icon={plugin.icon} name={plugin.name} size={40} />
            <span className="min-w-0 truncate">{plugin.name}</span>
          </span>
        }
        description={plugin.description ?? undefined}
        actions={
          plugin.marketplace !== "none" && (
            <Badge color="violet">
              {MARKETPLACE_LABELS[plugin.marketplace]} #{plugin.marketplace_id}
            </Badge>
          )
        }
      />

      {created && (
        <div className="mb-6">
          <Callout tone="ok">
            <strong>Plugin created!</strong> Follow the 3 steps below to add the license check to your plugin.
          </Callout>
        </div>
      )}

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="col-span-2 rounded-xl border border-line bg-panel p-4">
          <div className="mb-2 text-xs font-medium uppercase tracking-wide text-muted">Plugin ID</div>
          <CopyField value={plugin.id} />
        </div>
        <Stat label="Licenses" value={plugin.license_count} />
        <Stat label="Servers online" value={plugin.active_servers} hint={`${checks14d} checks in 14 days`} />
      </div>

      <MarketplaceStatus marketplace={plugin.marketplace} />

      <div className="grid gap-6 lg:grid-cols-5">
        <Card title="Add the license check to your plugin" className="lg:col-span-3">
          <PluginSetup pluginId={plugin.id} />
        </Card>
        <div className="space-y-6 lg:col-span-2">
          <Card title="Create a license" description="For buyers who paid you directly, friends, or testing.">
            <CreateLicenseForm plugin={plugin} />
          </Card>
        </div>
      </div>

      <Card
        className="mt-6"
        title={`Licenses (${total})`}
        actions={
          <form className="flex gap-2">
            <input name="q" defaultValue={q} className="input w-56" placeholder="Search key, buyer, note…" />
            <button className="btn-secondary">Search</button>
          </form>
        }
      >
        <LicenseTable licenses={rows} empty={q ? "No licenses match your search." : "No licenses yet. Create one above, or sell the plugin on a linked marketplace."} />
      </Card>
      <Pager total={total} limit={limit} offset={offset} base={`/dashboard/plugins/${id}${q ? `?q=${encodeURIComponent(q)}` : ""}`} />

      <Card className="mt-6" title="License checks" description="Last 14 days">
        <ChecksChart data={chart} />
      </Card>

      <Card className="mt-6" title="Plugin settings">
        <PluginForm plugin={plugin} />
      </Card>

      <Card className="mt-6 border-bad/30" title="Danger zone">
        <form action={deletePluginAction} className="flex flex-wrap items-center justify-between gap-3">
          <input type="hidden" name="id" value={plugin.id} />
          <p className="text-sm text-muted">Deleting the plugin deletes all {plugin.license_count} of its licenses. Servers using them will stop working.</p>
          <SubmitButton variant="danger" confirm={`Delete ${plugin.name} and all its licenses? This cannot be undone.`}>
            Delete plugin
          </SubmitButton>
        </form>
      </Card>
    </>
  );
}

function MarketplaceStatus({ marketplace }: { marketplace: string }) {
  if (marketplace === "builtbybit" && !getSetting("bbb_secret")) {
    return (
      <div className="mb-6">
        <Callout tone="warn">
          This plugin is linked to BuiltByBit, but the BuiltByBit placeholder isn&apos;t set up yet.{" "}
          <Link className="link" href="/dashboard/integrations#builtbybit">
            Set it up (2 minutes)
          </Link>
        </Callout>
      </div>
    );
  }
  if (marketplace === "tebex" && !getSetting("tebex_secret")) {
    return (
      <div className="mb-6">
        <Callout tone="warn">
          This plugin is linked to Tebex, but the Tebex webhook isn&apos;t set up yet.{" "}
          <Link className="link" href="/dashboard/integrations#tebex">
            Set it up
          </Link>
        </Callout>
      </div>
    );
  }
  if (marketplace !== "none" && publicUrl().includes("localhost")) {
    return (
      <div className="mb-6">
        <Callout tone="warn">
          Marketplaces can&apos;t reach <code>localhost</code>. Set your public site address in{" "}
          <Link className="link" href="/dashboard/settings">
            Settings
          </Link>{" "}
          once the site is online.
        </Callout>
      </div>
    );
  }
  return null;
}
