import { createSign, createPublicKey } from "node:crypto";
import { getSetting } from "./settings";

/**
 * The exact string that gets signed. The Java library rebuilds it the same way,
 * so the field order and separator must never change.
 */
export function signedPayload(f: { pluginId: string; key: string; status: string; nonce: string }): string {
  return ["xkl1", f.pluginId, f.key, f.status, f.nonce].join("|");
}

export function sign(data: string): string {
  const signer = createSign("SHA256");
  signer.update(data, "utf8");
  return signer.sign(getSetting("rsa_private")!, "base64");
}

export function publicKeyPem(): string {
  return getSetting("rsa_public")!;
}

/** Base64 of the DER public key, which is what Java's X509EncodedKeySpec wants. */
export function publicKeyBase64(): string {
  return createPublicKey(publicKeyPem()).export({ type: "spki", format: "der" }).toString("base64");
}
