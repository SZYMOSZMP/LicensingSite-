// Downloads the open-source ProGuard distribution into ./vendor/proguard so the
// Obfuscate / Auto setup features can run it. Safe to re-run; skips if already present.
//
//   node scripts/install-proguard.mjs
//
// The jar is not committed to git (see .gitignore). The server also downloads it on
// first use if it's missing, unless PROGUARD_AUTODOWNLOAD=false.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pipeline } from "node:stream/promises";
import { Readable } from "node:stream";
import { execFileSync } from "node:child_process";

const VERSION = process.env.PROGUARD_VERSION || "7.6.1";
const URL = `https://github.com/Guardsquare/proguard/releases/download/v${VERSION}/proguard-${VERSION}.zip`;
const DEST = path.resolve(process.cwd(), "vendor", "proguard");
const JAR = path.join(DEST, "lib", "proguard.jar");

export async function installProguard({ force = false } = {}) {
  if (!force && fs.existsSync(JAR)) {
    return JAR;
  }
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "proguard-dl-"));
  const zipPath = path.join(tmpDir, "proguard.zip");
  try {
    const res = await fetch(URL);
    if (!res.ok || !res.body) throw new Error(`Download failed (HTTP ${res.status}) from ${URL}`);
    await pipeline(Readable.fromWeb(res.body), fs.createWriteStream(zipPath));

    // Unzip with the system `unzip`, then move the versioned folder into place.
    const extractDir = path.join(tmpDir, "x");
    fs.mkdirSync(extractDir, { recursive: true });
    execFileSync("unzip", ["-q", zipPath, "-d", extractDir]);
    const inner = path.join(extractDir, `proguard-${VERSION}`);
    const src = fs.existsSync(inner) ? inner : extractDir;

    fs.rmSync(DEST, { recursive: true, force: true });
    fs.mkdirSync(path.dirname(DEST), { recursive: true });
    fs.renameSync(src, DEST);
    if (!fs.existsSync(JAR)) throw new Error(`proguard.jar not found after extracting to ${DEST}`);
    return JAR;
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

export const PROGUARD_JAR = JAR;

// Allow running directly: `node scripts/install-proguard.mjs`
if (import.meta.url === `file://${process.argv[1]}`) {
  installProguard({ force: process.argv.includes("--force") })
    .then((jar) => console.log(`ProGuard ${VERSION} ready at ${jar}`))
    .catch((err) => {
      console.error(err.message || err);
      process.exit(1);
    });
}
