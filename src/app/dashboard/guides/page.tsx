import Link from "next/link";
import { PageHeader } from "@/components/ui";
import { GUIDES } from "./content";

export const metadata = { title: "Guides" };

export default function GuidesPage() {
  return (
    <>
      <PageHeader title="Guides" description="Step-by-step help for every part of Xkixos Licensing. Code examples use your own site address and plugin ID." />
      <div className="grid gap-4 sm:grid-cols-2">
        {GUIDES.map((g, i) => (
          <Link key={g.slug} href={`/dashboard/guides/${g.slug}`} className="rounded-xl border border-line bg-panel p-5 transition hover:border-accent/50">
            <div className="text-xs font-medium text-accent-2">Guide {i + 1}</div>
            <div className="mt-1 font-semibold">{g.title}</div>
            <p className="mt-1 text-sm text-muted">{g.summary}</p>
          </Link>
        ))}
      </div>
    </>
  );
}
