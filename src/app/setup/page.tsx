import { redirect } from "next/navigation";
import { ActionForm, SubmitButton } from "@/components/client";
import { Field } from "@/components/ui";
import { adminExists } from "@/lib/auth";
import { setupAction } from "../actions";
import { AuthShell } from "../AuthShell";

export const dynamic = "force-dynamic";
export const metadata = { title: "Setup" };

export default function SetupPage() {
  if (adminExists()) redirect("/login");
  return (
    <AuthShell title="Welcome to Xkixos Licensing" subtitle="Create your owner account. Only you will be able to log in.">
      <ActionForm action={setupAction} className="space-y-4">
        <Field label="Username">
          <input name="username" className="input" autoComplete="username" required minLength={3} />
        </Field>
        <Field label="Password" hint="At least 8 characters.">
          <input name="password" type="password" className="input" autoComplete="new-password" required minLength={8} />
        </Field>
        <Field label="Confirm password">
          <input name="confirm" type="password" className="input" autoComplete="new-password" required />
        </Field>
        <Field label="Site address (optional)" hint="The public https address this site will run on. You can change it later in Settings.">
          <input name="public_url" className="input" placeholder="https://license.example.com" />
        </Field>
        <SubmitButton>Create account</SubmitButton>
      </ActionForm>
    </AuthShell>
  );
}
