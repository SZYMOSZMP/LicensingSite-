import Link from "next/link";
import { notFound } from "next/navigation";
import { BackLink, PageHeader } from "@/components/ui";
import { listPlugins } from "@/lib/services";
import { publicUrl } from "@/lib/settings";
import { GUIDES } from "../content";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const guide = GUIDES.find((g) => g.slug === slug);
  return { title: guide?.title ?? "Guide" };
}

export default async function GuidePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const index = GUIDES.findIndex((g) => g.slug === slug);
  if (index === -1) notFound();
  const guide = GUIDES[index];
  const next = GUIDES[index + 1];
  const pluginId = listPlugins()[0]?.id ?? "yourPluginId";

  return (
    <div className="max-w-3xl">
      <BackLink href="/dashboard/guides">Guides</BackLink>
      <PageHeader title={guide.title} description={guide.summary} />
      <article className="prose-guide">{guide.body({ baseUrl: publicUrl(), pluginId })}</article>
      {next && (
        <Link href={`/dashboard/guides/${next.slug}`} className="mt-10 block rounded-xl border border-line bg-panel p-4 hover:border-accent/50">
          <div className="text-xs text-muted">Next guide</div>
          <div className="font-semibold">{next.title} →</div>
        </Link>
      )}
    </div>
  );
}
