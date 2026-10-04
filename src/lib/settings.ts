import { db } from "./db";

export type SettingKey =
  | "public_url"
  | "rsa_private"
  | "rsa_public"
  | "bbb_secret"
  | "polymart_api_key"
  | "tebex_secret"
  | "smtp_host"
  | "smtp_port"
  | "smtp_secure"
  | "smtp_user"
  | "smtp_pass"
  | "smtp_from"
  | "email_subject"
  | "email_body";

export function getSetting(key: SettingKey): string | null {
  const row = db().prepare("SELECT value FROM settings WHERE key = ?").get(key) as { value: string } | undefined;
  return row?.value ?? null;
}

export function setSetting(key: SettingKey, value: string | null) {
  if (value === null || value === "") {
    db().prepare("DELETE FROM settings WHERE key = ?").run(key);
  } else {
    db().prepare("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)").run(key, value);
  }
}

/** Public base URL without a trailing slash. */
export function publicUrl(): string {
  const url = getSetting("public_url") || process.env.PUBLIC_URL || `http://localhost:${process.env.PORT || 3000}`;
  return url.replace(/\/+$/, "");
}
