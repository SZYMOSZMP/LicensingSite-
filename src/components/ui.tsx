import Link from "next/link";
import type { ReactNode } from "react";

export function PageHeader({ title, description, actions }: { title: ReactNode; description?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {description && <p className="mt-1 text-sm text-muted">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Card({ title, description, children, className = "", actions }: {
  title?: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  className?: string;
  actions?: ReactNode;
}) {
  return (
    <section className={`rounded-xl border border-line bg-panel ${className}`}>
      {(title || actions) && (
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line px-5 py-4">
          <div>
            {title && <h2 className="font-semibold">{title}</h2>}
            {description && <p className="mt-0.5 text-sm text-muted">{description}</p>}
          </div>
          {actions}
        </div>
      )}
      <div className="p-5">{children}</div>
    </section>
  );
}

export function Stat({ label, value, hint }: { label: string; value: ReactNode; hint?: ReactNode }) {
  return (
    <div className="rounded-xl border border-line bg-panel p-4">
      <div className="text-xs font-medium uppercase tracking-wide text-muted">{label}</div>
      <div className="mt-1 text-2xl font-semibold tabular-nums">{value}</div>
      {hint && <div className="mt-1 text-xs text-muted">{hint}</div>}
    </div>
  );
}

export function Field({ label, hint, children, className = "" }: { label: string; hint?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1.5 block text-sm font-medium">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-muted">{hint}</span>}
    </label>
  );
}

const BADGE: Record<string, string> = {
  green: "bg-ok/15 text-ok border-ok/30",
  red: "bg-bad/15 text-bad border-bad/30",
  amber: "bg-warn/15 text-warn border-warn/30",
  gray: "bg-panel-2 text-muted border-line",
  violet: "bg-accent/15 text-accent-2 border-accent/30",
};

export function Badge({ color = "gray", children }: { color?: keyof typeof BADGE; children: ReactNode }) {
  return <span className={`inline-flex items-center rounded-md border px-1.5 py-0.5 text-xs font-medium ${BADGE[color]}`}>{children}</span>;
}

export function StatusBadge({ status }: { status: string }) {
  const color = status === "valid" ? "green" : status === "server_error" || status === "rate_limited" ? "amber" : "red";
  return <Badge color={color}>{status}</Badge>;
}

export function LicenseState({ enabled, expiresAt }: { enabled: number | boolean; expiresAt: number | null }) {
  if (!enabled) return <Badge color="red">Disabled</Badge>;
  if (expiresAt !== null && expiresAt < Date.now()) return <Badge color="amber">Expired</Badge>;
  return <Badge color="green">Active</Badge>;
}

export function Table({ head, children, empty }: { head: ReactNode[]; children: ReactNode; empty?: ReactNode }) {
  const hasRows = Array.isArray(children) ? children.length > 0 : !!children;
  return (
    <div className="-mx-5 -my-5 overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-line text-xs uppercase tracking-wide text-muted">
            {head.map((h, i) => (
              <th key={i} className="whitespace-nowrap px-5 py-3 font-medium">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {hasRows ? (
            children
          ) : (
            <tr>
              <td colSpan={head.length} className="px-5 py-10 text-center text-muted">
                {empty ?? "Nothing here yet."}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

export function Td({ children, className = "" }: { children?: ReactNode; className?: string }) {
  return <td className={`px-5 py-3 align-middle ${className}`}>{children}</td>;
}

export function Mono({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <code className={`font-mono text-[0.85em] ${className}`}>{children}</code>;
}

export function Callout({ tone = "info", children }: { tone?: "info" | "warn" | "ok"; children: ReactNode }) {
  const styles = {
    info: "border-accent/30 bg-accent/10",
    warn: "border-warn/30 bg-warn/10",
    ok: "border-ok/30 bg-ok/10",
  }[tone];
  return <div className={`rounded-lg border px-4 py-3 text-sm leading-relaxed ${styles}`}>{children}</div>;
}

export function PluginIcon({ icon, name, size = 36 }: { icon: string | null; name: string; size?: number }) {
  if (icon) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={icon} alt="" width={size} height={size} className="shrink-0 rounded-lg border border-line object-cover" style={{ width: size, height: size }} />;
  }
  return (
    <div
      className="flex shrink-0 items-center justify-center rounded-lg bg-accent/20 font-semibold text-accent-2"
      style={{ width: size, height: size, fontSize: size * 0.42 }}
    >
      {name.slice(0, 1).toUpperCase()}
    </div>
  );
}

export function BackLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="mb-3 inline-flex items-center gap-1 text-sm text-muted hover:text-fg">
      ← {children}
    </Link>
  );
}
