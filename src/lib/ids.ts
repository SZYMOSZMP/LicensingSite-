import { randomBytes, randomUUID, createHash } from "node:crypto";

const ALPHABET = "abcdefghijklmnopqrstuvwxyz0123456789";

export function randomString(length: number, alphabet = ALPHABET): string {
  const out: string[] = [];
  // Rejection sampling keeps the distribution uniform.
  const max = 256 - (256 % alphabet.length);
  while (out.length < length) {
    for (const b of randomBytes(length * 2)) {
      if (b < max && out.length < length) out.push(alphabet[b % alphabet.length]);
    }
  }
  return out.join("");
}

export const newPluginId = () => randomString(8);
export const newLicenseKey = () => randomUUID();
export const newId = () => randomString(12);
export const newSecret = (prefix = "") => prefix + randomString(40, ALPHABET + "ABCDEFGHIJKLMNOPQRSTUVWXYZ");

export function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export const LICENSE_KEY_RE = /^[A-Za-z0-9_-]{1,64}$/;
export const PLUGIN_ID_RE = /^[a-z0-9]{8}$/;
export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
