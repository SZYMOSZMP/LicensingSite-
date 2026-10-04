import { apiRoute, json, readJson } from "@/lib/api";
import { pluginInputFromApi, pluginJson } from "@/lib/serialize";
import { createPlugin, listPlugins } from "@/lib/services";

export const dynamic = "force-dynamic";

export const GET = apiRoute(() => json(listPlugins().map(pluginJson)));

export const POST = apiRoute(async (req) => json(pluginJson(createPlugin(pluginInputFromApi(await readJson(req)))), 201));
