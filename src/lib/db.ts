import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import { generateKeyPairSync } from "node:crypto";

const SCHEMA = `
CREATE TABLE IF NOT EXISTS settings (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS admin (
  id            INTEGER PRIMARY KEY CHECK (id = 1),
  username      TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  created_at    INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS plugins (
  id                    TEXT PRIMARY KEY,
  name                  TEXT NOT NULL,
  icon                  TEXT,
  description           TEXT,
  marketplace           TEXT NOT NULL DEFAULT 'none',
  marketplace_id        TEXT,
  marketplace_url       TEXT,
  default_max_ips       INTEGER NOT NULL DEFAULT 1,
  default_duration_days INTEGER NOT NULL DEFAULT 0,
  created_at            INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS licenses (
  key               TEXT PRIMARY KEY,
  plugin_id         TEXT NOT NULL REFERENCES plugins(id) ON DELETE CASCADE,
  user              TEXT,
  note              TEXT,
  max_ips           INTEGER NOT NULL DEFAULT 1,
  expires_at        INTEGER,
  enabled           INTEGER NOT NULL DEFAULT 1,
  source            TEXT NOT NULL DEFAULT 'manual',
  source_ref        TEXT,
  created_at        INTEGER NOT NULL,
  last_validated_at INTEGER
);
CREATE INDEX IF NOT EXISTS licenses_plugin ON licenses(plugin_id);
CREATE UNIQUE INDEX IF NOT EXISTS licenses_source_ref
  ON licenses(plugin_id, source, source_ref) WHERE source_ref IS NOT NULL;

CREATE TABLE IF NOT EXISTS license_sessions (
  license_key TEXT NOT NULL REFERENCES licenses(key) ON DELETE CASCADE ON UPDATE CASCADE,
  session_id  TEXT NOT NULL,
  ip          TEXT NOT NULL,
  started_at  INTEGER NOT NULL,
  last_seen   INTEGER NOT NULL,
  PRIMARY KEY (license_key, session_id)
);

CREATE TABLE IF NOT EXISTS blacklist (
  id         TEXT PRIMARY KEY,
  ip         TEXT NOT NULL UNIQUE,
  reason     TEXT,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS checks (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  plugin_id   TEXT NOT NULL,
  license_key TEXT NOT NULL,
  ip          TEXT NOT NULL,
  status      TEXT NOT NULL,
  created_at  INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS checks_created ON checks(created_at);
CREATE INDEX IF NOT EXISTS checks_license ON checks(license_key);

CREATE TABLE IF NOT EXISTS api_keys (
  id           TEXT PRIMARY KEY,
  name         TEXT NOT NULL,
  key_hash     TEXT NOT NULL UNIQUE,
  prefix       TEXT NOT NULL,
  created_at   INTEGER NOT NULL,
  last_used_at INTEGER
);

CREATE TABLE IF NOT EXISTS events (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  kind       TEXT NOT NULL,
  message    TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
`;

type Db = Database.Database;
const g = globalThis as unknown as { __xklDb?: Db };

function open(): Db {
  const dir = path.resolve(/*turbopackIgnore: true*/ process.env.DATA_DIR || "./data");
  fs.mkdirSync(dir, { recursive: true });
  const db = new Database(path.join(dir, "xkixos.db"));
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  db.pragma("busy_timeout = 5000");
  db.exec(SCHEMA);
  ensureRsaKeys(db);
  return db;
}

function ensureRsaKeys(db: Db) {
  const row = db.prepare("SELECT value FROM settings WHERE key = 'rsa_private'").get();
  if (row) return;
  const { privateKey, publicKey } = generateKeyPairSync("rsa", {
    modulusLength: 2048,
    publicKeyEncoding: { type: "spki", format: "pem" },
    privateKeyEncoding: { type: "pkcs8", format: "pem" },
  });
  const put = db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)");
  put.run("rsa_private", privateKey);
  put.run("rsa_public", publicKey);
}

export function db(): Db {
  if (!g.__xklDb) g.__xklDb = open();
  return g.__xklDb;
}

/** Records something worth showing on the dashboard (webhook results, email failures...). */
export function logEvent(kind: string, message: string) {
  db().prepare("INSERT INTO events (kind, message, created_at) VALUES (?, ?, ?)").run(kind, message, Date.now());
}
