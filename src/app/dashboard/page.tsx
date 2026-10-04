import Link from "next/link";
import { ChecksChart } from "@/components/ChecksChart";
import { Card, Callout, PageHeader, Stat } from "@/components/ui";
import { db } from "@/lib/db";
import { timeAgo } from "@/lib/format";
import { dailyChecks, listPlugins, overviewStats, recentEvents } from "@/lib/services";
import { getSetting, publicUrl } from "@/lib/settings";

export const metadata = { title: "Overview" };

export default function Overview() {
  const stats = overviewStats();
  const plugins = listPlugins();
  const events = recentEvents(8);
  const hasUrl = !!(getSetting("public_url") || process.env.PUBLIC_URL);
  const hasLicense = stats.licenses > 0;
  const hasCheck = (db().prepare("SELECT 1 FROM checks WHERE status = 'valid' LIMIT 1").get() as unknown) !== undefined;
  const rate = stats.checks24h ? Math.round((stats.valid24h / stats.checks24h) * 100) : null;

  const steps = [
    { done: hasUrl, label: "Set your site address", href: "/dashboard/settings", detail: hasUrl ? publicUrl() : "So plugins know where to check licenses" },
    { done: plugins.length > 0, label: "Create your first plugin", href: "/dashboard/plugins", detail: "Each plugin gets an 8 character ID" },
    { done: hasLicense, label: "Create or sell a license", href: "/dashboard/guides/builtbybit", detail: "Manually, or automatically through BuiltByBit / Polymart / Tebex" },
    { done: hasCheck, label: "Add the check to your plugin", href: "/dashboard/guides/plugin-setup", detail: "Copy one class and one if-statement into onEnable" },
  ];
  const allDone = steps.every((s) => s.done);

  return (
    <>
      <PageHeader title="Overview" description="Everything happening with your licenses." />

      {!allDone && (
        <Card title="Getting started" description="Follow these steps to protect your first plugin." className="mb-6">
          <ol className="space-y-2">
            {steps.map((s, i) => (
              <li key={s.label}>
                <Link href={s.href} className="flex items-center gap-3 rounded-lg border border-line px-4 py-3 hover:border-accent/50">
                  <span
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                      s.done ? "bg-ok/20 text-ok" : "bg-panel-2 text-muted"
                    }`}
                  >
                    {s.done ? "✓" : i + 1}
                  </span>
                  <span className="min-w-0">
                    <span className={`block text-sm font-medium ${s.done ? "text-muted line-through" : ""}`}>{s.label}</span>
                    <span className="block truncate text-xs text-muted">{s.detail}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ol>
        </Card>
      )}

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Plugins" value={stats.plugins} />
        <Stat label="Licenses" value={stats.licenses.toLocaleString()} />
        <Stat label="Servers online" value={stats.activeServers} hint="Sent a heartbeat in the last 90s" />
        <Stat label="Checks (24h)" value={stats.checks24h.toLocaleString()} hint={rate === null ? "No checks yet" : `${rate}% valid`} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card title="License checks" description="Last 14 days" className="lg:col-span-2">
          <ChecksChart data={dailyChecks(14)} />
        </Card>
        <Card title="Recent activity" description="Marketplace and webhook events">
          {events.length === 0 ? (
            <p className="text-sm text-muted">Nothing yet. BuiltByBit downloads, Polymart verifications and Tebex purchases show up here.</p>
          ) : (
            <ul className="space-y-3">
              {events.map((e) => (
                <li key={e.id} className="text-sm">
                  <div className="flex items-center justify-between gap-2 text-xs text-muted">
                    <span className="font-medium uppercase tracking-wide">{e.kind}</span>
                    <span>{timeAgo(e.created_at)}</span>
                  </div>
                  <p className="mt-0.5 break-words text-fg/85">{e.message}</p>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {!hasUrl && (
        <div className="mt-6">
          <Callout tone="warn">
            Your site address isn&apos;t set, so plugins and marketplaces would be pointed at <code>{publicUrl()}</code>. Set it in{" "}
            <Link className="link" href="/dashboard/settings">
              Settings
            </Link>{" "}
            before downloading the Java class.
          </Callout>
        </div>
      )}
    </>
  );
}
