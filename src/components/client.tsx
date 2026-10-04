"use client";

import { useActionState, useEffect, useRef, useState, type ReactNode } from "react";
import { useFormStatus } from "react-dom";

export type ActionState = { error?: string; ok?: string; secret?: string } | null;
type Action = (prev: ActionState, form: FormData) => Promise<ActionState>;

/** A form bound to a server action that shows the action's error / success message. */
export function ActionForm({
  action,
  children,
  className = "",
  reset = false,
}: {
  action: Action;
  children: ReactNode;
  className?: string;
  reset?: boolean;
}) {
  const [state, formAction] = useActionState(action, null);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (reset && state?.ok) ref.current?.reset();
  }, [state, reset]);
  return (
    <form ref={ref} action={formAction} className={className}>
      {children}
      {state?.error && <p className="mt-3 rounded-lg border border-bad/30 bg-bad/10 px-3 py-2 text-sm text-bad">{state.error}</p>}
      {state?.ok && <p className="mt-3 rounded-lg border border-ok/30 bg-ok/10 px-3 py-2 text-sm text-ok">{state.ok}</p>}
      {state?.secret && (
        <div className="mt-3 rounded-lg border border-warn/30 bg-warn/10 p-3 text-sm">
          <p className="mb-2 text-warn">Copy this now, it won&apos;t be shown again:</p>
          <CopyField value={state.secret} />
        </div>
      )}
    </form>
  );
}

// Written out in full so Tailwind sees every class name.
const VARIANTS = { primary: "btn-primary", secondary: "btn-secondary", danger: "btn-danger", ghost: "btn-ghost" };

export function SubmitButton({ children, variant = "primary", confirm: confirmText }: { children: ReactNode; variant?: "primary" | "secondary" | "danger" | "ghost"; confirm?: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      className={VARIANTS[variant]}
      disabled={pending}
      onClick={(e) => {
        if (confirmText && !window.confirm(confirmText)) e.preventDefault();
      }}
    >
      {pending ? "Working…" : children}
    </button>
  );
}

export function CopyButton({ value, label = "Copy" }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className="btn-secondary px-2.5 py-1 text-xs"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
        } catch {
          const ta = document.createElement("textarea");
          ta.value = value;
          document.body.appendChild(ta);
          ta.select();
          document.execCommand("copy");
          ta.remove();
        }
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
    >
      {copied ? "Copied!" : label}
    </button>
  );
}

export function CopyField({ value, mono = true }: { value: string; mono?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <input readOnly value={value} className={`input ${mono ? "font-mono text-xs" : ""}`} onFocus={(e) => e.currentTarget.select()} />
      <CopyButton value={value} />
    </div>
  );
}

export function CodeBlock({ code, lang }: { code: string; lang?: string }) {
  return (
    <div className="group relative my-3 overflow-hidden rounded-lg border border-line bg-bg">
      {lang && <div className="border-b border-line px-3 py-1.5 text-xs text-muted">{lang}</div>}
      <div className="absolute right-2 top-1.5 opacity-70 group-hover:opacity-100">
        <CopyButton value={code} />
      </div>
      <pre className="overflow-x-auto p-4 font-mono text-[13px] leading-relaxed text-fg/90">
        <code>{code}</code>
      </pre>
    </div>
  );
}

/** Copy-paste code examples that switch between build tools. */
export function CodeTabs({ tabs }: { tabs: { label: string; code: string }[] }) {
  const [active, setActive] = useState(0);
  return (
    <div className="my-3">
      <div className="flex flex-wrap gap-1">
        {tabs.map((t, i) => (
          <button
            key={t.label}
            type="button"
            onClick={() => setActive(i)}
            className={`rounded-t-lg border border-b-0 px-3 py-1.5 text-xs ${i === active ? "border-line bg-bg text-fg" : "border-transparent text-muted hover:text-fg"}`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="-mt-3">
        <CodeBlock code={tabs[active].code} />
      </div>
    </div>
  );
}
