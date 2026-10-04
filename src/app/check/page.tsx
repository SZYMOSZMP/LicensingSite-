import { LicenseChecker } from "./LicenseChecker";

export const metadata = { title: "Check your license" };

export default async function CheckPage({ searchParams }: { searchParams: Promise<{ plugin?: string }> }) {
  const { plugin } = await searchParams;
  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-accent to-accent-2 text-xl font-bold text-white">X</div>
          <h1 className="text-xl font-semibold">Check your license</h1>
          <p className="mt-1 text-sm text-muted">See if your license key is active, when it expires and how many servers use it.</p>
        </div>
        <LicenseChecker initialPluginId={plugin ?? ""} />
      </div>
    </main>
  );
}
