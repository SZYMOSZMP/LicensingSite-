"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { CopyField } from "./client";
import { Field } from "./ui";

function filenameFromResponse(res: Response, fallback: string): string {
  const cd = res.headers.get("Content-Disposition") || "";
  const m = /filename="?([^"]+)"?/.exec(cd);
  return m?.[1] || fallback;
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

async function errorFrom(res: Response): Promise<string> {
  try {
    const body = await res.json();
    return body?.error || `Request failed (${res.status})`;
  } catch {
    return `Request failed (${res.status})`;
  }
}

function Alert({ error }: { error: string | null }) {
  if (!error) return null;
  return <p className="mt-3 rounded-lg border border-bad/30 bg-bad/10 px-3 py-2 text-sm text-bad">{error}</p>;
}

function JarInput({ note }: { note?: ReactNode }) {
  return (
    <Field label="Plugin jar (.jar)" hint={note}>
      <input
        name="jar"
        type="file"
        accept=".jar,application/java-archive"
        required
        className="block w-full text-sm text-muted file:mr-3 file:rounded-lg file:border-0 file:bg-accent file:px-4 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-accent/90"
      />
    </Field>
  );
}

function Submit({ pending, children }: { pending: boolean; children: ReactNode }) {
  return (
    <button type="submit" className="btn-primary" disabled={pending}>
      {pending ? "Working… this can take a minute" : children}
    </button>
  );
}

/** Upload a jar, get the obfuscated jar back as a download. */
export function ObfuscateForm() {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formEl = e.currentTarget;
    setError(null);
    setDone(null);
    setPending(true);
    try {
      const res = await fetch("/api/obfuscate", { method: "POST", body: new FormData(formEl) });
      if (!res.ok) {
        setError(await errorFrom(res));
        return;
      }
      const blob = await res.blob();
      const name = filenameFromResponse(res, "plugin-obfuscated.jar");
      downloadBlob(blob, name);
      setDone(name);
      formEl.reset();
    } catch {
      setError("Network error. Try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <JarInput note="The obfuscated jar downloads automatically when it's ready." />
      <Submit pending={pending}>Obfuscate jar</Submit>
      <Alert error={error} />
      {done && <p className="mt-3 rounded-lg border border-ok/30 bg-ok/10 px-3 py-2 text-sm text-ok">Downloaded {done}. Test it on a server before shipping.</p>}
    </form>
  );
}

interface AutoSetupDone {
  pluginId: string;
  pluginName: string;
  licenseKey: string;
  publicUrl: string;
  filename: string;
}

/** Upload a jar; it's obfuscated, a plugin is registered and a license key is minted in one step. */
export function AutoSetupForm() {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AutoSetupDone | null>(null);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formEl = e.currentTarget;
    setError(null);
    setResult(null);
    setPending(true);
    try {
      const res = await fetch("/api/auto-setup", { method: "POST", body: new FormData(formEl) });
      if (!res.ok) {
        setError(await errorFrom(res));
        return;
      }
      const blob = await res.blob();
      const filename = filenameFromResponse(res, "plugin-obfuscated.jar");
      downloadBlob(blob, filename);
      setResult({
        pluginId: res.headers.get("X-Plugin-Id") || "",
        pluginName: decodeURIComponent(res.headers.get("X-Plugin-Name") || ""),
        licenseKey: res.headers.get("X-License-Key") || "",
        publicUrl: res.headers.get("X-Public-Url") || "",
        filename,
      });
      formEl.reset();
    } catch {
      setError("Network error. Try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <JarInput note="We read the plugin name from plugin.yml if you leave the name blank." />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Plugin name (optional)">
          <input name="name" className="input" placeholder="From plugin.yml" />
        </Field>
        <Field label="License owner (optional)" hint="A name or email to attach to the key.">
          <input name="user" className="input" placeholder="buyer@example.com" />
        </Field>
      </div>
      <Submit pending={pending}>Obfuscate &amp; create license</Submit>
      <Alert error={error} />
      {result && (
        <div className="mt-3 space-y-3 rounded-lg border border-ok/30 bg-ok/10 p-4 text-sm">
          <p className="text-ok">
            Done. Obfuscated <strong>{result.pluginName}</strong> and downloaded {result.filename}.
          </p>
          <div>
            <div className="mb-1.5 font-medium">License key</div>
            <CopyField value={result.licenseKey} />
          </div>
          <div>
            <div className="mb-1.5 font-medium">Plugin ID</div>
            <CopyField value={result.pluginId} />
          </div>
          <p className="text-muted">
            Give the buyer the license key. Manage it any time under{" "}
            <a className="text-accent-2 underline" href={`/dashboard/plugins/${result.pluginId}`}>
              Plugins → {result.pluginName}
            </a>
            .
          </p>
        </div>
      )}
    </form>
  );
}
