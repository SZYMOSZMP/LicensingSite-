"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const NAV = [
  { href: "/dashboard", label: "Overview", icon: "◧" },
  { href: "/dashboard/plugins", label: "Plugins", icon: "⬡" },
  { href: "/dashboard/licenses", label: "Licenses", icon: "⚿" },
  { href: "/dashboard/blacklist", label: "Blacklist", icon: "⊘" },
  { href: "/dashboard/checks", label: "Check log", icon: "≡" },
  { href: "/dashboard/integrations", label: "Integrations", icon: "⇄" },
  { href: "/dashboard/api-keys", label: "API keys", icon: "⌘" },
  { href: "/dashboard/guides", label: "Guides", icon: "?" },
  { href: "/dashboard/settings", label: "Settings", icon: "⚙" },
];

export function Sidebar({ logout }: { logout: () => Promise<void> }) {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const active = (href: string) => (href === "/dashboard" ? path === href : path.startsWith(href));
  return (
    <>
      <div className="sticky top-0 z-20 flex items-center justify-between border-b border-line bg-bg/90 px-4 py-3 backdrop-blur md:hidden">
        <Brand />
        <button className="btn-ghost px-2" onClick={() => setOpen(!open)} aria-label="Menu">
          ☰
        </button>
      </div>
      <aside
        className={`${open ? "block" : "hidden"} border-b border-line bg-panel md:sticky md:top-0 md:block md:h-screen md:w-60 md:shrink-0 md:border-r md:border-b-0`}
      >
        <div className="flex h-full flex-col p-3">
          <div className="hidden px-2 py-3 md:block">
            <Brand />
          </div>
          <nav className="mt-2 flex-1 space-y-0.5">
            {NAV.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                onClick={() => setOpen(false)}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition ${
                  active(n.href) ? "bg-accent/15 font-medium text-fg" : "text-muted hover:bg-panel-2 hover:text-fg"
                }`}
              >
                <span className={`w-4 text-center ${active(n.href) ? "text-accent-2" : ""}`}>{n.icon}</span>
                {n.label}
              </Link>
            ))}
          </nav>
          <div className="mt-4 space-y-1 border-t border-line pt-3">
            <Link href="/check" target="_blank" className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted hover:bg-panel-2 hover:text-fg">
              <span className="w-4 text-center">↗</span> Public checker
            </Link>
            <form action={logout}>
              <button className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm text-muted hover:bg-panel-2 hover:text-fg">
                <span className="w-4 text-center">⏻</span> Log out
              </button>
            </form>
          </div>
        </div>
      </aside>
    </>
  );
}

export function Brand() {
  return (
    <Link href="/dashboard" className="flex items-center gap-2.5">
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-accent to-accent-2 text-sm font-bold text-white">X</span>
      <span className="leading-tight">
        <span className="block text-sm font-semibold">Xkixos</span>
        <span className="block text-xs text-muted">Licensing</span>
      </span>
    </Link>
  );
}
