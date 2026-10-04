"use client";

import { useState } from "react";
import { MARKETPLACE_LABELS, MARKETPLACES, type Marketplace } from "@/lib/types";

const HINTS: Record<Marketplace, { label: string; placeholder: string; hint: string }> = {
  none: { label: "", placeholder: "", hint: "You create keys yourself from the dashboard or the API." },
  builtbybit: {
    label: "BuiltByBit resource URL",
    placeholder: "https://builtbybit.com/resources/my-plugin.12345/",
    hint: "Paste the resource page link (or just the number at the end). Buyers get a key baked into their download.",
  },
  polymart: {
    label: "Polymart resource URL",
    placeholder: "https://polymart.org/resource/my-plugin.1234",
    hint: "Paste the resource page link (or its ID). Purchases are verified with Polymart on first startup.",
  },
  tebex: {
    label: "Tebex package ID",
    placeholder: "5232113",
    hint: "Find it in Tebex → Packages, or the number at the end of the package URL. Buyers are emailed their key.",
  },
};

export function MarketplaceFields({ marketplace = "none", marketplaceValue = "" }: { marketplace?: Marketplace; marketplaceValue?: string }) {
  const [type, setType] = useState<Marketplace>(marketplace);
  const h = HINTS[type];
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <label className="block">
        <span className="mb-1.5 block text-sm font-medium">Sold on</span>
        <select name="marketplace" className="input" value={type} onChange={(e) => setType(e.target.value as Marketplace)}>
          {MARKETPLACES.map((m) => (
            <option key={m} value={m}>
              {MARKETPLACE_LABELS[m]}
            </option>
          ))}
        </select>
        {type === "none" && <span className="mt-1 block text-xs text-muted">{h.hint}</span>}
      </label>
      {type !== "none" && (
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium">{h.label}</span>
          <input name="marketplace_id" className="input" placeholder={h.placeholder} defaultValue={type === marketplace ? marketplaceValue : ""} required />
          <span className="mt-1 block text-xs text-muted">{h.hint}</span>
        </label>
      )}
    </div>
  );
}
