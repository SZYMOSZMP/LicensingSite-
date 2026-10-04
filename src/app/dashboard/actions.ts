"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { ActionState } from "@/components/client";
import { endSession, requireAdmin, setPassword, validatePassword, verifyPassword, getAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { newId, newSecret, sha256 } from "@/lib/ids";
import { sendTestEmail } from "@/lib/mail";
import {
  addBlacklist,
  createLicense,
  createPlugin,
  deleteLicense,
  deletePlugin,
  removeBlacklist,
  resetLicenseSessions,
  setLicenseEnabled,
  updateLicense,
  updatePlugin,
} from "@/lib/services";
import { setSetting, type SettingKey } from "@/lib/settings";
import { UserError } from "@/lib/types";

/** Runs a mutation and converts UserErrors into a message for the form. */
async function run(fn: () => ActionState | void | Promise<ActionState | void>, revalidate = "/dashboard"): Promise<ActionState> {
  await requireAdmin();
  try {
    const result = await fn();
    revalidatePath(revalidate, "layout");
    return result ?? { ok: "Saved" };
  } catch (err) {
    if (err instanceof UserError) return { error: err.message };
    if (err && typeof err === "object" && "digest" in err) throw err; // redirect()/notFound()
    console.error(err);
    return { error: err instanceof Error ? err.message : "Something went wrong" };
  }
}

const field = (form: FormData, name: string) => {
  const v = form.get(name);
  return v === null ? undefined : String(v);
};

// ---------- plugins ----------

export async function createPluginAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  let id = "";
  const result = await run(() => {
    id = createPlugin({
      name: field(form, "name"),
      icon: field(form, "icon"),
      description: field(form, "description"),
      marketplace: field(form, "marketplace"),
      marketplace_id: field(form, "marketplace_id") ?? "",
      default_max_ips: field(form, "default_max_ips"),
      default_duration_days: field(form, "default_duration_days"),
    }).id;
  });
  if (result?.error) return result;
  redirect(`/dashboard/plugins/${id}?created=1`);
}

export async function updatePluginAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  return run(() => {
    updatePlugin(String(form.get("id")), {
      name: field(form, "name"),
      icon: field(form, "icon") ?? "",
      description: field(form, "description") ?? "",
      marketplace: field(form, "marketplace"),
      marketplace_id: field(form, "marketplace_id") ?? "",
      default_max_ips: field(form, "default_max_ips"),
      default_duration_days: field(form, "default_duration_days"),
    });
    return { ok: "Plugin saved" };
  });
}

export async function deletePluginAction(form: FormData) {
  await requireAdmin();
  deletePlugin(String(form.get("id")));
  revalidatePath("/dashboard", "layout");
  redirect("/dashboard/plugins");
}

// ---------- licenses ----------

export async function createLicenseAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  return run(() => {
    const pluginId = String(form.get("plugin_id"));
    const count = Math.min(Math.max(Number(form.get("count") || 1), 1), 100);
    const keys: string[] = [];
    for (let i = 0; i < count; i++) {
      keys.push(
        createLicense(pluginId, {
          key: count === 1 ? field(form, "key") : undefined,
          user: field(form, "user"),
          note: field(form, "note"),
          max_ips: field(form, "max_ips"),
          expires_at: field(form, "expires_at") || null,
        }).key,
      );
    }
    return { ok: count === 1 ? `License created: ${keys[0]}` : `${count} licenses created`, secret: keys.join("\n") };
  });
}

export async function updateLicenseAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  return run(() => {
    updateLicense(String(form.get("key")), {
      user: field(form, "user") ?? "",
      note: field(form, "note") ?? "",
      max_ips: field(form, "max_ips"),
      expires_at: field(form, "expires_at") ?? null,
      enabled: form.get("enabled") ? "1" : "0",
    });
    return { ok: "License saved" };
  });
}

export async function toggleLicenseAction(form: FormData) {
  await requireAdmin();
  setLicenseEnabled(String(form.get("key")), form.get("enabled") === "1");
  revalidatePath("/dashboard", "layout");
}

export async function resetSessionsAction(form: FormData) {
  await requireAdmin();
  resetLicenseSessions(String(form.get("key")));
  revalidatePath("/dashboard", "layout");
}

export async function deleteLicenseAction(form: FormData) {
  await requireAdmin();
  const key = String(form.get("key"));
  const back = String(form.get("back") || "/dashboard/licenses");
  deleteLicense(key);
  revalidatePath("/dashboard", "layout");
  redirect(back.startsWith("/dashboard") ? back : "/dashboard/licenses");
}

// ---------- blacklist ----------

export async function addBlacklistAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  return run(() => {
    const entry = addBlacklist({ ip: field(form, "ip"), reason: field(form, "reason") });
    return { ok: `${entry.ip} is now blocked` };
  });
}

export async function removeBlacklistAction(form: FormData) {
  await requireAdmin();
  removeBlacklist(String(form.get("id")));
  revalidatePath("/dashboard", "layout");
}

// ---------- integrations ----------

export async function generateBbbSecretAction(_prev: ActionState): Promise<ActionState> {
  return run(() => {
    setSetting("bbb_secret", newSecret());
    return { ok: "New secret generated. Paste it into your BuiltByBit placeholder." };
  });
}

export async function saveSettingsAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  const allowed: SettingKey[] = [
    "polymart_api_key",
    "tebex_secret",
    "smtp_host",
    "smtp_port",
    "smtp_secure",
    "smtp_user",
    "smtp_pass",
    "smtp_from",
    "email_subject",
    "email_body",
    "public_url",
  ];
  return run(() => {
    for (const key of allowed) {
      if (!form.has(key)) continue;
      let value = String(form.get(key) ?? "").trim();
      // Password-style fields are left blank to keep the saved value.
      if ((key === "smtp_pass" || key === "polymart_api_key" || key === "tebex_secret") && value === "" && !form.get(`clear_${key}`)) continue;
      if (key === "public_url" && value) {
        if (!/^https?:\/\/[^\s/]+/.test(value)) throw new UserError("Site address must start with http:// or https://");
        value = value.replace(/\/+$/, "");
      }
      if (key === "smtp_port" && value && !/^\d{1,5}$/.test(value)) throw new UserError("SMTP port must be a number");
      setSetting(key, value);
    }
    if (form.has("smtp_host")) setSetting("smtp_secure", form.get("smtp_secure_check") ? "true" : "false");
    return { ok: "Saved" };
  });
}

export async function testEmailAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  return run(async () => {
    const to = String(form.get("to") || "").trim();
    if (!/^[^\s@]+@[^\s@]+$/.test(to)) throw new UserError("Enter an email address");
    await sendTestEmail(to);
    return { ok: `Test email sent to ${to}` };
  });
}

// ---------- api keys ----------

export async function createApiKeyAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  return run(() => {
    const name = String(form.get("name") || "").trim().slice(0, 60) || "API key";
    const key = newSecret("xkl_");
    db()
      .prepare("INSERT INTO api_keys (id, name, key_hash, prefix, created_at) VALUES (?, ?, ?, ?, ?)")
      .run(newId(), name, sha256(key), key.slice(0, 10), Date.now());
    return { ok: `API key "${name}" created`, secret: key };
  });
}

export async function deleteApiKeyAction(form: FormData) {
  await requireAdmin();
  db().prepare("DELETE FROM api_keys WHERE id = ?").run(String(form.get("id")));
  revalidatePath("/dashboard", "layout");
}

// ---------- account ----------

export async function changePasswordAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  return run(async () => {
    const admin = getAdmin()!;
    if (!verifyPassword(String(form.get("current") || ""), admin.password_hash)) throw new UserError("Current password is wrong");
    const next = String(form.get("password") || "");
    const err = validatePassword(next);
    if (err) throw new UserError(err);
    if (next !== String(form.get("confirm") || "")) throw new UserError("New passwords don't match");
    setPassword(next);
    // setPassword logs out every session, including this one.
    redirect("/login");
  });
}

export async function logoutAction() {
  await endSession();
  redirect("/login");
}
