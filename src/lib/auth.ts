import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "./db";
import { sha256 } from "./ids";
import { publicUrl } from "./settings";

const COOKIE = "xkl_session";
const SESSION_DAYS = 30;

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `scrypt$${salt}$${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [, salt, hash] = stored.split("$");
  if (!salt || !hash) return false;
  const actual = scryptSync(password, salt, 64);
  const expected = Buffer.from(hash, "hex");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export function adminExists(): boolean {
  return !!db().prepare("SELECT 1 FROM admin WHERE id = 1").get();
}

export function getAdmin() {
  return db().prepare("SELECT username, password_hash FROM admin WHERE id = 1").get() as
    | { username: string; password_hash: string }
    | undefined;
}

export function validatePassword(password: string): string | null {
  if (password.length < 8) return "Password must be at least 8 characters";
  if (password.length > 200) return "Password is too long";
  return null;
}

export function createAdmin(username: string, password: string) {
  db()
    .prepare("INSERT INTO admin (id, username, password_hash, created_at) VALUES (1, ?, ?, ?)")
    .run(username, hashPassword(password), Date.now());
}

export function setPassword(password: string) {
  db().prepare("UPDATE admin SET password_hash = ? WHERE id = 1").run(hashPassword(password));
  // Log out every other device.
  db().prepare("DELETE FROM sessions").run();
}

export async function startSession() {
  const token = randomBytes(32).toString("hex");
  const expires = Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000;
  db().prepare("INSERT INTO sessions (token_hash, created_at, expires_at) VALUES (?, ?, ?)").run(sha256(token), Date.now(), expires);
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: publicUrl().startsWith("https://") && process.env.NODE_ENV === "production",
    path: "/",
    expires: new Date(expires),
  });
}

export async function isLoggedIn(): Promise<boolean> {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return false;
  const row = db().prepare("SELECT expires_at FROM sessions WHERE token_hash = ?").get(sha256(token)) as
    | { expires_at: number }
    | undefined;
  return !!row && row.expires_at > Date.now();
}

/** Call at the top of every dashboard page and server action. */
export async function requireAdmin() {
  if (!(await isLoggedIn())) redirect(adminExists() ? "/login" : "/setup");
}

export async function endSession() {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (token) db().prepare("DELETE FROM sessions WHERE token_hash = ?").run(sha256(token));
  jar.delete(COOKIE);
}
