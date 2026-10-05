import { AutoSetupForm } from "@/components/ObfuscateForms";
import { Callout, Card, PageHeader } from "@/components/ui";

export const metadata = { title: "Auto setup" };

export default function AutoSetupPage() {
  return (
    <>
      <PageHeader
        title="Auto setup"
        description="Send a jar and get everything in one step: it's obfuscated, a plugin is registered, and a license key is created for you."
      />
      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <Card title="Upload jar">
          <AutoSetupForm />
        </Card>
        <div className="space-y-4">
          <Callout>
            <strong>What happens:</strong> your jar is obfuscated with ProGuard, a new plugin entry is created (named from
            <code> plugin.yml</code> unless you set one), and a fresh license key is minted and shown to you. The obfuscated
            jar downloads automatically.
          </Callout>
          <Callout tone="warn">
            Already have the plugin set up? Use <strong>Obfuscate</strong> instead — this page always creates a new plugin and
            key.
          </Callout>
        </div>
      </div>
    </>
  );
}
