import Link from "next/link";
import { PluginForm } from "@/components/PluginForm";
import { Badge, Card, PageHeader, PluginIcon } from "@/components/ui";
import { listPlugins } from "@/lib/services";
import { MARKETPLACE_LABELS } from "@/lib/types";

export const metadata = { title: "Plugins" };

export default function PluginsPage() {
  const plugins = listPlugins();
  return (
    <>
      <PageHeader title="Plugins" description="Each plugin you sell gets its own ID and its own licenses." />

      {plugins.length > 0 && (
        <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {plugins.map((p) => (
            <Link key={p.id} href={`/dashboard/plugins/${p.id}`} className="rounded-xl border border-line bg-panel p-4 transition hover:border-accent/50">
              <div className="flex items-center gap-3">
                <PluginIcon icon={p.icon} name={p.name} />
                <div className="min-w-0">
                  <div className="truncate font-semibold">{p.name}</div>
                  <div className="font-mono text-xs text-muted">{p.id}</div>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-muted">
                <span>{p.license_count} licenses</span>
                <span>·</span>
                <span>{p.active_servers} online</span>
                {p.marketplace !== "none" && (
                  <span className="ml-auto">
                    <Badge color="violet">{MARKETPLACE_LABELS[p.marketplace]}</Badge>
                  </span>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}

      <Card title={plugins.length ? "Add another plugin" : "Create your first plugin"} description="You can change all of this later.">
        <PluginForm />
      </Card>
    </>
  );
}
