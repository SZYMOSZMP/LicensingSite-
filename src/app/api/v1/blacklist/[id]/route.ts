import { apiRoute, json, readJson } from "@/lib/api";
import { blacklistJson } from "@/lib/serialize";
import { getBlacklistEntry, removeBlacklist, updateBlacklist } from "@/lib/services";
import { UserError } from "@/lib/types";

export const dynamic = "force-dynamic";
type P = { id: string };

export const GET = apiRoute<P>((_req, { id }) => {
  const entry = getBlacklistEntry(id);
  if (!entry) throw new UserError("Blacklist entry not found", 404);
  return json(blacklistJson(entry));
});

export const PATCH = apiRoute<P>(async (req, { id }) => json(blacklistJson(updateBlacklist(id, await readJson(req)))));

export const DELETE = apiRoute<P>((_req, { id }) => {
  removeBlacklist(id);
  return json({ deleted: true });
});
