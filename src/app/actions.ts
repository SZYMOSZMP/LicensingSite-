"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import type { ActionState } from "@/components/client";
import { adminExists, createAdmin, getAdmin, startSession, validatePassword, verifyPassword } from "@/lib/auth";
import { clientIp } from "@/lib/ip";
import { rateLimited } from "@/lib/ratelimit";
import { setSetting } from "@/lib/settings";

export async function setupAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  if (adminExists()) redirect("/login");
  const username = String(form.get("username") || "").trim();
  const password = String(form.get("password") || "");
  const confirm = String(form.get("confirm") || "");
  const url = String(form.get("public_url") || "").trim();
  if (!/^[A-Za-z0-9_.-]{3,32}$/.test(username)) return { error: "Username must be 3-32 letters, numbers, dots, dashes or underscores" };
  const pwError = validatePassword(password);
  if (pwError) return { error: pwError };
  if (password !== confirm) return { error: "Passwords don't match" };
  if (url && !/^https?:\/\/[^\s/]+/.test(url)) return { error: "Site address must start with http:// or https://" };
  createAdmin(username, password);
  if (url) setSetting("public_url", url.replace(/\/+$/, ""));
  await startSession();
  redirect("/dashboard");
}

export async function loginAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  const ip = clientIp(await headers());
  if (rateLimited(`login:${ip}`, 10, 15 * 60_000)) return { error: "Too many attempts. Wait 15 minutes and try again." };
  const admin = getAdmin();
  if (!admin) redirect("/setup");
  const password = String(form.get("password") || "");
  // The site is protected by a single password; the username field is optional.
  if (!verifyPassword(password, admin.password_hash)) return { error: "Wrong password" };
  await startSession();
  redirect("/dashboard");
}
