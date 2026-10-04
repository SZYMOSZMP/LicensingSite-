import { apiRoute, json, readJson } from "@/lib/api";
import { licenseInputFromApi, licenseJson } from "@/lib/serialize";
import { createLicense, getPlugin, listLicenses } from "@/lib/services";
import { UserError } from "@/lib/types";

export const dynamic = "force-dynamic";
type P = { pluginId: string };

export const GET = apiRoute<P>((req, { pluginId }) => {
  if (!getPlugin(pluginId)) throw new UserError("Plugin not found", 404);
  const url = new URL(req.url);
  const { rows, total } = listLicenses({
    pluginId,
    q: url.searchParams.get("q") || undefined,
    limit: Number(url.searchParams.get("limit")) || 100,
    offset: Number(url.searchParams.get("offset")) || 0,
  });
  return json({ total, licenses: rows.map(licenseJson) });
});

export const POST = apiRoute<P>(async (req, { pluginId }) => {
  const input = licenseInputFromApi(await readJson(req));
  const clean = Object.fromEntries(Object.entries(input).filter(([, v]) => v !== undefined));
  return json(licenseJson(createLicense(pluginId, clean, "api")), 201);
});
