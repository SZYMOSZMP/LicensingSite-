import { ObfuscateForm } from "@/components/ObfuscateForms";
import { Callout, Card, PageHeader } from "@/components/ui";

export const metadata = { title: "Obfuscate" };

export default function ObfuscatePage() {
  return (
    <>
      <PageHeader
        title="Obfuscate a plugin"
        description="Upload a built plugin jar and get back an obfuscated one — class, method and field names are stripped and dead code removed with open-source ProGuard."
      />
      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <Card title="Upload jar">
          <ObfuscateForm />
        </Card>
        <div className="space-y-4">
          <Callout>
            This renames and shrinks the bytecode so other operators can&apos;t easily read your code. It is
            <strong> not encryption</strong> — string literals stay readable and a determined reverser still can. Always test the
            obfuscated jar on a real server before shipping.
          </Callout>
          <Callout tone="warn">
            Needs Java (a JDK) on the server. For the strongest, safest result, point <code>PAPER_API_JAR</code> at your
            server API jar so ProGuard can see the classes your plugin extends.
          </Callout>
        </div>
      </div>
    </>
  );
}
