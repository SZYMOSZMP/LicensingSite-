import fs from "node:fs";
import path from "node:path";
import { publicKeyBase64 } from "./signing";
import { publicUrl } from "./settings";

const TEMPLATE = path.join(process.cwd(), "library", "src", "main", "java", "xkixos", "licensing", "XkixosLicense.java");
export const DEFAULT_PACKAGE = "xkixos.licensing";
export const JAVA_PACKAGE_RE = /^[a-z_][a-z0-9_]*(\.[a-z_][a-z0-9_]*)*$/;

/** The library class with this server's URL and public key filled in, moved into `pkg`. */
export function renderJavaLibrary(pkg = DEFAULT_PACKAGE): string {
  if (!JAVA_PACKAGE_RE.test(pkg)) throw new Error("Invalid Java package name");
  return fs
    .readFileSync(TEMPLATE, "utf8")
    .replace(/^package [\w.]+;/m, `package ${pkg};`)
    .replace("__XKL_BASE_URL__", publicUrl())
    .replace("__XKL_PUBLIC_KEY__", publicKeyBase64());
}
