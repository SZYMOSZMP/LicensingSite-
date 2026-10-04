import nodemailer from "nodemailer";
import { getSetting, publicUrl } from "./settings";

export const DEFAULT_SUBJECT = "Your license key for {plugin}";
export const DEFAULT_BODY = `Hi {name},

Thanks for buying {plugin}! Here is your license key:

{keys}

How to use it:
1. Put the plugin jar in your server's plugins folder and start the server once.
2. Open plugins/{plugin}/license.txt and paste your key into it.
3. Restart the server.

You can check your license at any time here: {checkUrl}

Have fun!`;

export function smtpConfigured(): boolean {
  return !!(getSetting("smtp_host") && getSetting("smtp_from"));
}

function transport() {
  const port = Number(getSetting("smtp_port") || 587);
  return nodemailer.createTransport({
    host: getSetting("smtp_host")!,
    port,
    secure: getSetting("smtp_secure") === "true" || port === 465,
    auth: getSetting("smtp_user") ? { user: getSetting("smtp_user")!, pass: getSetting("smtp_pass") ?? "" } : undefined,
  });
}

function fill(template: string, vars: Record<string, string>) {
  return template.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? vars[k] : m));
}

export async function sendLicenseEmail(opts: { to: string; name: string; plugin: string; pluginId: string; keys: string[] }) {
  if (!smtpConfigured()) throw new Error("SMTP is not configured (Dashboard → Integrations → Email)");
  const vars = {
    name: opts.name || "there",
    plugin: opts.plugin,
    keys: opts.keys.join("\n"),
    checkUrl: `${publicUrl()}/check?plugin=${opts.pluginId}`,
  };
  await transport().sendMail({
    from: getSetting("smtp_from")!,
    to: opts.to,
    subject: fill(getSetting("email_subject") || DEFAULT_SUBJECT, vars),
    text: fill(getSetting("email_body") || DEFAULT_BODY, vars),
  });
}

export async function sendTestEmail(to: string) {
  if (!smtpConfigured()) throw new Error("Fill in at least the SMTP host and From address first");
  await transport().sendMail({
    from: getSetting("smtp_from")!,
    to,
    subject: "Xkixos Licensing test email",
    text: "If you can read this, Tebex purchase emails will work.",
  });
}
