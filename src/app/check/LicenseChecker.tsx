"use client";

import { useState } from "react";
import type { BuyerLookup } from "@/lib/check";

export function LicenseChecker({ initialPluginId }: { initialPluginId: string }) {
  const [pluginId, setPluginId] = useState(initialPluginId);
  const [key, setKey] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<BuyerLookup | { error: string } | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch(`/api/check?pluginId=${encodeURIComponent(pluginId.trim())}&key=${encodeURIComponent(key.trim())}`);
      setResult(await res.json());
    } catch {
      setResult({ error: "Could not reach the server" });
    }
    setLoading(false);
  }

  return (
    <div className="rounded-xl border border-line bg-panel p-6">
      <form onSubmit={submit} className="space-y-4">
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium">Plugin ID</span>
          <input className="input font-mono" value={pluginId} onChange={(e) => setPluginId(e.target.value)} placeholder="e.g. 9qxwb0cf" required maxLength={8} />
          <span className="mt-1 block text-xs text-muted">8 characters. Ask the plugin author if you don&apos;t have it.</span>
        </label>
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium">License key</span>
          <input className="input font-mono" value={key} onChange={(e) => setKey(e.target.value)} placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" required />
        </label>
        <button className="btn-primary w-full" disabled={loading}>
          {loading ? "Checking…" : "Check license"}
        </button>
      </form>

      {result && "error" in result && <p className="mt-4 rounded-lg border border-bad/30 bg-bad/10 px-3 py-2 text-sm text-bad">{result.error}</p>}
      {result && "found" in result && !result.found && (
        <p className="mt-4 rounded-lg border border-bad/30 bg-bad/10 px-3 py-2 text-sm text-bad">No license found with that plugin ID and key.</p>
      )}
      {result && "found" in result && result.found && (
        <dl className="mt-5 divide-y divide-line rounded-lg border border-line text-sm">
          <Row label="Plugin" value={result.plugin} />
          <Row
            label="Status"
            value={
              <span className={result.status === "active" ? "text-ok" : result.status === "expired" ? "text-warn" : "text-bad"}>
                {result.status[0].toUpperCase() + result.status.slice(1)}
              </span>
            }
          />
          <Row label="Expires" value={result.expiresOn ? new Date(result.expiresOn).toISOString().slice(0, 10) : "Never"} />
          <Row label="Servers online" value={`${result.activeServers} / ${result.maxServers === 0 ? "unlimited" : result.maxServers}`} />
        </dl>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 px-4 py-2.5">
      <dt className="text-muted">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}
