// End-to-end tests. Run `npm run build` first, then `npm test`.
// Starts the real server on a random port with a throwaway database.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import Database from "better-sqlite3";

const PORT = 3900 + Math.floor(Math.random() * 90);
const BASE = `http://127.0.0.1:${PORT}`;
const DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), "xkl-test-"));
const API_KEY = "xkl_test_" + crypto.randomBytes(12).toString("hex");
const BBB_SECRET = "bbbsecret123";
const TEBEX_SECRET = "tebexsecret123";
let server;
let db;
let publicKey;

async function waitForServer() {
  for (let i = 0; i < 100; i++) {
    try {
      // A well-formed lookup touches the database, which creates it.
      await fetch(`${BASE}/api/check?pluginId=aaaaaaaa&key=init`);
      return;
    } catch {
      await new Promise((r) => setTimeout(r, 200));
    }
  }
  throw new Error("server did not start");
}

before(async () => {
  server = spawn(process.execPath, ["server.mjs"], {
    env: { ...process.env, PORT: String(PORT), DATA_DIR, TRUST_PROXY: "true", NODE_ENV: "production", PUBLIC_URL: BASE },
    stdio: "ignore",
  });
  await waitForServer();
  db = new Database(path.join(DATA_DIR, "xkixos.db"));
  const put = db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)");
  put.run("bbb_secret", BBB_SECRET);
  put.run("tebex_secret", TEBEX_SECRET);
  db.prepare("INSERT INTO api_keys (id, name, key_hash, prefix, created_at) VALUES ('t', 'test', ?, 'xkl_test', 0)").run(
    crypto.createHash("sha256").update(API_KEY).digest("hex"),
  );
  publicKey = db.prepare("SELECT value FROM settings WHERE key = 'rsa_public'").get().value;
});

after(() => {
  server?.kill();
  db?.close();
  fs.rmSync(DATA_DIR, { recursive: true, force: true });
});

const api = async (method, url, body) => {
  const res = await fetch(BASE + url, {
    method,
    headers: { "X-API-Key": API_KEY, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: res.status, body: await res.json() };
};

async function validate(pluginId, key, { ip = "198.51.100.1", sessionId = crypto.randomUUID() } = {}) {
  const nonce = crypto.randomUUID();
  const res = await fetch(`${BASE}/api/validate/${pluginId}/${encodeURIComponent(key)}?sessionId=${sessionId}&nonce=${nonce}`, {
    headers: { "X-Forwarded-For": ip },
  });
  const body = await res.json();
  const payload = ["xkl1", body.pluginId, body.key, body.status, body.nonce].join("|");
  const signed = crypto.verify("sha256", Buffer.from(payload), publicKey, Buffer.from(body.signature, "base64"));
  assert.ok(signed, "response signature must verify");
  assert.equal(body.nonce, nonce);
  return { ...body, sessionId };
}

let plugin;

test("REST API requires a key", async () => {
  const res = await fetch(`${BASE}/api/v1/plugins`);
  assert.equal(res.status, 401);
});

test("create plugin via API, parsing a BuiltByBit URL", async () => {
  const res = await api("POST", "/api/v1/plugins", {
    name: "TestPlugin",
    marketplace: { type: "builtbybit", url: "https://builtbybit.com/resources/test-plugin.4242/" },
    defaultMaxIps: 1,
  });
  assert.equal(res.status, 201);
  assert.match(res.body.id, /^[a-z0-9]{8}$/);
  assert.equal(res.body.marketplace.id, "4242");
  plugin = res.body;
});

test("validation statuses", async () => {
  const { body: lic } = await api("POST", `/api/v1/plugins/${plugin.id}/licenses`, { user: "Steve", maxIps: 1 });
  assert.equal((await validate(plugin.id, lic.key)).status, "valid");
  assert.equal((await validate(plugin.id, "does-not-exist")).status, "not_found");
  assert.equal((await validate(plugin.id, "bad key!")).status, "invalid_format");
  assert.equal((await validate("zzzzzzzz", lic.key)).status, "not_found");

  await api("PATCH", `/api/v1/licenses/${lic.key}`, { enabled: false });
  assert.equal((await validate(plugin.id, lic.key)).status, "disabled");
  await api("PATCH", `/api/v1/licenses/${lic.key}`, { enabled: true, expiresOn: "2001-01-01" });
  assert.equal((await validate(plugin.id, lic.key)).status, "expired");
  await api("PATCH", `/api/v1/licenses/${lic.key}`, { expiresOn: "Never" });
  assert.equal((await validate(plugin.id, lic.key)).status, "valid");
});

test("max servers counts distinct IPs and frees slots on shutdown", async () => {
  const { body: lic } = await api("POST", `/api/v1/plugins/${plugin.id}/licenses`, { maxIps: 1 });
  const first = await validate(plugin.id, lic.key, { ip: "203.0.113.1" });
  assert.equal(first.status, "valid");
  // Same IP restarting is fine
  assert.equal((await validate(plugin.id, lic.key, { ip: "203.0.113.1" })).status, "valid");
  // Different IP is over the limit
  assert.equal((await validate(plugin.id, lic.key, { ip: "203.0.113.2" })).status, "max_ips");

  // Heartbeat from the right IP works, from another IP does not
  const hb = (ip, body) =>
    fetch(`${BASE}/api/heartbeat/${plugin.id}/${lic.key}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Forwarded-For": ip },
      body: JSON.stringify(body),
    });
  assert.equal((await hb("203.0.113.1", { sessionId: first.sessionId })).status, 200);
  assert.equal((await hb("203.0.113.9", { sessionId: first.sessionId })).status, 404);

  // Shut down every session on the first IP, then the second IP gets in
  db.prepare("DELETE FROM license_sessions WHERE license_key = ? AND session_id != ?").run(lic.key, first.sessionId);
  assert.equal((await hb("203.0.113.1", { sessionId: first.sessionId, shutdown: true })).status, 200);
  assert.equal((await validate(plugin.id, lic.key, { ip: "203.0.113.2" })).status, "valid");
});

test("blacklist blocks an IP", async () => {
  const { body: lic } = await api("POST", `/api/v1/plugins/${plugin.id}/licenses`, { maxIps: 0 });
  const { status, body: entry } = await api("POST", "/api/v1/blacklist", { ip: "192.0.2.66", reason: "test" });
  assert.equal(status, 201);
  assert.equal((await validate(plugin.id, lic.key, { ip: "192.0.2.66" })).status, "blacklisted");
  await api("DELETE", `/api/v1/blacklist/${entry.id}`);
  assert.equal((await validate(plugin.id, lic.key, { ip: "192.0.2.66" })).status, "valid");
});

test("BuiltByBit placeholder creates one key per buyer", async () => {
  const send = (fields) =>
    fetch(`${BASE}/api/builtbybit`, {
      method: "POST",
      body: new URLSearchParams({ builtbybit: "true", steam_id: "", version_id: "1", version_number: "1.0", ...fields }),
    });
  const bad = await send({ user_id: "777", resource_id: "4242", secret: "wrong" });
  assert.equal(bad.status, 401);

  const res1 = await send({ user_id: "777", resource_id: "4242", secret: BBB_SECRET });
  assert.equal(res1.status, 200);
  const key = await res1.text();
  assert.match(key, /^[0-9a-f-]{36}$/);
  const res2 = await send({ user_id: "777", resource_id: "4242", secret: BBB_SECRET });
  assert.equal(await res2.text(), key, "re-download returns the same key");

  const unknown = await send({ user_id: "777", resource_id: "9999", secret: BBB_SECRET });
  assert.equal(unknown.status, 404);

  const { body: lic } = await api("GET", `/api/v1/licenses/${key}`);
  assert.equal(lic.source, "builtbybit");
  assert.equal(lic.user, "BuiltByBit #777");
  assert.equal((await validate(plugin.id, key, { ip: "198.51.100.50" })).status, "valid");
});

test("Tebex webhook: validation, purchase, retry, refund", async () => {
  const { body: tebexPlugin } = await api("POST", "/api/v1/plugins", { name: "TebexPlugin", marketplace: { type: "tebex", id: "5551" } });
  const send = (payload, secret = TEBEX_SECRET) => {
    const raw = JSON.stringify(payload);
    const sig = crypto.createHmac("sha256", secret).update(crypto.createHash("sha256").update(raw).digest("hex")).digest("hex");
    return fetch(`${BASE}/api/tebex`, { method: "POST", headers: { "Content-Type": "application/json", "X-Signature": sig }, body: raw });
  };

  const v = await send({ id: "abc-123", type: "validation.webhook", subject: {} });
  assert.equal(v.status, 200);
  assert.deepEqual(await v.json(), { id: "abc-123" });
  assert.equal((await send({ id: "x", type: "validation.webhook" }, "wrong")).status, 401);

  const purchase = {
    id: "evt1",
    type: "payment.completed",
    subject: {
      transaction_id: "tbx-1",
      products: [{ id: 5551, name: "TebexPlugin", quantity: 2 }, { id: 1, name: "Other" }],
      customer: { first_name: "Alex", email: "alex@example.com", username: { username: "AlexMC" } },
    },
  };
  const p1 = await send(purchase);
  assert.equal(p1.status, 200);
  assert.equal((await p1.json()).created, 2);
  const p2 = await send(purchase);
  assert.equal((await p2.json()).created, 0, "retries do not create duplicates");

  const { body: list } = await api("GET", `/api/v1/plugins/${tebexPlugin.id}/licenses`);
  assert.equal(list.total, 2);
  assert.ok(list.licenses.every((l) => l.user === "AlexMC" && l.enabled));

  await send({ id: "evt2", type: "payment.refunded", subject: { transaction_id: "tbx-1" } });
  const { body: after } = await api("GET", `/api/v1/plugins/${tebexPlugin.id}/licenses`);
  assert.ok(after.licenses.every((l) => !l.enabled), "refund disables the keys");
});

test("public checker hides private fields", async () => {
  const { body: lic } = await api("POST", `/api/v1/plugins/${plugin.id}/licenses`, { user: "Secret Person", maxIps: 3 });
  const res = await fetch(`${BASE}/api/check?pluginId=${plugin.id}&key=${lic.key}`);
  const body = await res.json();
  assert.equal(body.found, true);
  assert.equal(body.status, "active");
  assert.equal(body.maxServers, 3);
  assert.ok(!JSON.stringify(body).includes("Secret Person"));
  const wrong = await fetch(`${BASE}/api/check?pluginId=aaaaaaaa&key=${lic.key}`);
  assert.equal(wrong.status, 404);
});

test("deleting a plugin deletes its licenses", async () => {
  const { body: p } = await api("POST", "/api/v1/plugins", { name: "Temp" });
  const { body: lic } = await api("POST", `/api/v1/plugins/${p.id}/licenses`, {});
  assert.equal((await api("DELETE", `/api/v1/plugins/${p.id}`)).status, 200);
  assert.equal((await api("GET", `/api/v1/licenses/${lic.key}`)).status, 404);
});

test("BuiltByBit per-plugin link", async () => {
  const { body: p } = await api("POST", "/api/v1/plugins", {
    name: "LinkPlugin",
    marketplace: { type: "builtbybit", url: "https://builtbybit.com/resources/link-plugin.5150/" },
  });
  const send = (pluginId, fields) =>
    fetch(`${BASE}/api/builtbybit/${pluginId}`, {
      method: "POST",
      body: new URLSearchParams({ builtbybit: "true", steam_id: "", version_id: "1", version_number: "1.0", secret: BBB_SECRET, ...fields }),
    });
  const ok = await send(p.id, { user_id: "900", resource_id: "5150" });
  assert.equal(ok.status, 200);
  const key = await ok.text();
  const { body: lic } = await api("GET", `/api/v1/licenses/${key}`);
  assert.equal(lic.pluginId, p.id);

  const wrongResource = await send(p.id, { user_id: "900", resource_id: "4242" });
  assert.equal(wrongResource.status, 400, "a plugin's link only accepts its own resource");
  const unknown = await send("zzzzzzzz", { user_id: "900", resource_id: "5150" });
  assert.equal(unknown.status, 404);
  const badSecret = await send(p.id, { user_id: "900", resource_id: "5150", secret: "nope" });
  assert.equal(badSecret.status, 401);
});
