import Link from "next/link";
import { CodeTabs } from "@/components/client";
import { Callout } from "@/components/ui";
import { onEnableJava, onEnableKotlin } from "@/lib/snippets";

/** Step-by-step instructions for adding the license check to a specific plugin. */
export function PluginSetup({ pluginId }: { pluginId: string }) {
  return (
    <ol className="space-y-6">
      <li>
        <Step n={1} title="Download the license class">
          <p className="text-sm text-muted">
            It already contains your site address and public key. Type the package you want it in (usually your plugin&apos;s package + <code>.license</code>), then
            put the file in that folder of your project.
          </p>
          <form action="/api/library" method="get" className="mt-3 flex flex-col gap-2 sm:flex-row">
            <input name="package" className="input font-mono sm:max-w-sm" placeholder="me.you.myplugin.license" defaultValue="" />
            <button className="btn-primary whitespace-nowrap">Download XkixosLicense.java</button>
          </form>
          <p className="mt-2 text-xs text-muted">No extra dependencies: it only uses Gson, which every Spigot/Paper/Folia server already has.</p>
        </Step>
      </li>
      <li>
        <Step n={2} title="Check the license in onEnable">
          <p className="text-sm text-muted">Put this at the very top of your onEnable. If the key is not valid, the plugin turns itself off.</p>
          <CodeTabs
            tabs={[
              { label: "Java", code: onEnableJava(pluginId) },
              { label: "Kotlin", code: onEnableKotlin(pluginId) },
            ]}
          />
          <p className="text-xs text-muted">Change the import if you picked a different package in step 1.</p>
        </Step>
      </li>
      <li>
        <Step n={3} title="Build, then give the buyer their key">
          <p className="text-sm text-muted">
            On first start the plugin creates <code>plugins/YourPlugin/license.txt</code>. The buyer pastes their key into it and restarts. BuiltByBit and Polymart
            downloads skip this step because the key is already baked into the jar.
          </p>
          <div className="mt-3">
            <Callout>
              Obfuscating your jar (for example with ProGuard or Skidfuscator) makes it much harder for someone to just delete the check. See the{" "}
              <Link className="link" href="/dashboard/guides/plugin-setup">
                full guide
              </Link>
              .
            </Callout>
          </div>
        </Step>
      </li>
    </ol>
  );
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-4">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent/20 text-sm font-semibold text-accent-2">{n}</span>
      <div className="min-w-0 flex-1">
        <h3 className="mb-1 font-semibold">{title}</h3>
        {children}
      </div>
    </div>
  );
}
