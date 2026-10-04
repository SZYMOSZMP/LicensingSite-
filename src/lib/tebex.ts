import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { db, logEvent } from "./db";
import { sendLicenseEmail, smtpConfigured } from "./mail";
import { createLicense, findLicenseBySource, findPluginByMarketplace } from "./services";
import { getSetting } from "./settings";

interface TebexProduct {
  id?: number | string;
  name?: string;
  quantity?: number;
}

interface TebexWebhook {
  id?: string;
  type?: string;
  subject?: {
    transaction_id?: string;
    products?: TebexProduct[];
    customer?: { first_name?: string; last_name?: string; email?: string; username?: { username?: string } };
  };
}

export type TebexResult = { status: number; body: unknown };

/** Tebex signs webhooks as HMAC-SHA256(secret, SHA256(rawBody)) in the X-Signature header. */
export function verifyTebexSignature(rawBody: string, signature: string | null, secret: string): boolean {
  if (!signature) return false;
  const bodyHash = createHash("sha256").update(rawBody, "utf8").digest("hex");
  const expected = createHmac("sha256", secret).update(bodyHash).digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(signature.trim().toLowerCase());
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function handleTebex(rawBody: string, signature: string | null): Promise<TebexResult> {
  const secret = getSetting("tebex_secret");
  if (!secret) return { status: 503, body: { error: "Tebex integration is not set up" } };
  if (!verifyTebexSignature(rawBody, signature, secret)) {
    logEvent("tebex", "Rejected a webhook with an invalid signature");
    return { status: 401, body: { error: "Invalid signature" } };
  }

  let hook: TebexWebhook;
  try {
    hook = JSON.parse(rawBody);
  } catch {
    return { status: 400, body: { error: "Invalid JSON" } };
  }

  // Tebex sends this once when you add the endpoint, and expects its id echoed back.
  if (hook.type === "validation.webhook") return { status: 200, body: { id: hook.id } };

  const txn = hook.subject?.transaction_id;
  if (!txn) return { status: 200, body: { ignored: true } };

  if (hook.type === "payment.refunded" || hook.type === "payment.dispute.opened") {
    const res = db()
      .prepare("UPDATE licenses SET enabled = 0 WHERE source = 'tebex' AND source_ref LIKE ?")
      .run(`${txn}:%`);
    if (res.changes) logEvent("tebex", `Disabled ${res.changes} license(s) after ${hook.type} on ${txn}`);
    return { status: 200, body: { disabled: res.changes } };
  }

  if (hook.type !== "payment.completed") return { status: 200, body: { ignored: true } };

  const customer = hook.subject?.customer ?? {};
  const name = [customer.first_name, customer.last_name].filter(Boolean).join(" ") || customer.username?.username || "";
  const user = customer.username?.username || customer.email || name || null;
  const created: string[] = [];

  for (const product of hook.subject?.products ?? []) {
    if (product.id === undefined) continue;
    const plugin = findPluginByMarketplace("tebex", String(product.id));
    if (!plugin) continue;

    const keys: string[] = [];
    let fresh = 0;
    const quantity = Math.min(Math.max(Number(product.quantity) || 1, 1), 50);
    for (let i = 0; i < quantity; i++) {
      // The ref makes the webhook safe to retry: a repeat delivery reuses the same licenses.
      const ref = `${txn}:${product.id}:${i}`;
      const existing = findLicenseBySource(plugin.id, "tebex", ref);
      if (existing) {
        keys.push(existing.key);
        continue;
      }
      const license = createLicense(
        plugin.id,
        { user, note: `Tebex ${txn}${customer.email ? ` · ${customer.email}` : ""}` },
        "tebex",
        ref,
      );
      keys.push(license.key);
      created.push(license.key);
      fresh++;
    }
    // A retried delivery already emailed these keys.
    if (fresh === 0) continue;

    if (!customer.email) {
      logEvent("tebex", `Created ${keys.length} license(s) for ${plugin.name} (${txn}) but the payment had no email address`);
      continue;
    }
    if (!smtpConfigured()) {
      logEvent("tebex", `Created license(s) for ${plugin.name} (${txn}) but email is not set up, so ${customer.email} was not emailed`);
      continue;
    }
    try {
      await sendLicenseEmail({ to: customer.email, name, plugin: plugin.name, pluginId: plugin.id, keys });
      logEvent("tebex", `Emailed ${keys.length} ${plugin.name} key(s) to ${customer.email} (${txn})`);
    } catch (err) {
      logEvent("tebex", `License(s) created for ${txn}, but emailing ${customer.email} failed: ${err instanceof Error ? err.message : err}`);
    }
  }

  return { status: 200, body: { created: created.length } };
}
