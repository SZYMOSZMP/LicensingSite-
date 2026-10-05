import { redirect } from "next/navigation";
import { ActionForm, SubmitButton } from "@/components/client";
import { Field } from "@/components/ui";
import { adminExists, isLoggedIn } from "@/lib/auth";
import { loginAction } from "../actions";
import { AuthShell } from "../AuthShell";

export const dynamic = "force-dynamic";
export const metadata = { title: "Log in" };

export default async function LoginPage() {
  if (!adminExists()) redirect("/setup");
  if (await isLoggedIn()) redirect("/dashboard");
  return (
    <AuthShell title="Log in" subtitle="Enter the password to open the dashboard">
      <ActionForm action={loginAction} className="space-y-4">
        <Field label="Password">
          <input name="password" type="password" className="input" autoComplete="current-password" required autoFocus />
        </Field>
        <SubmitButton>Log in</SubmitButton>
      </ActionForm>
    </AuthShell>
  );
}
