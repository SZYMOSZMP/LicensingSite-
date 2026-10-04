import { apiRoute, json, readJson, safeDecode } from "@/lib/api";
import { licenseInputFromApi, licenseJson } from "@/lib/serialize";
import { deleteLicense, getLicense, updateLicense } from "@/lib/services";
import { UserError } from "@/lib/types";

export const dynamic = "force-dynamic";
type P = { licenseKey: string };

export const GET = apiRoute<P>((_req, { licenseKey }) => {
  const license = getLicense(safeDecode(licenseKey));
  if (!license) throw new UserError("License not found", 404);
  return json(licenseJson(license));
});

export const PATCH = apiRoute<P>(async (req, { licenseKey }) => {
  const input = licenseInputFromApi(await readJson(req));
  delete input.key;
  const clean = Object.fromEntries(Object.entries(input).filter(([, v]) => v !== undefined));
  return json(licenseJson(updateLicense(safeDecode(licenseKey), clean)));
});

export const DELETE = apiRoute<P>((_req, { licenseKey }) => {
  deleteLicense(safeDecode(licenseKey));
  return json({ deleted: true });
});
