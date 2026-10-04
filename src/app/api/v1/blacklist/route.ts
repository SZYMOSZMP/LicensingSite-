import { apiRoute, json, readJson } from "@/lib/api";
import { blacklistJson } from "@/lib/serialize";
import { addBlacklist, listBlacklist } from "@/lib/services";

export const dynamic = "force-dynamic";

export const GET = apiRoute(() => json(listBlacklist().map(blacklistJson)));

export const POST = apiRoute(async (req) => json(blacklistJson(addBlacklist(await readJson(req))), 201));
