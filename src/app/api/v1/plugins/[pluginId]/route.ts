import { apiRoute, json, readJson } from "@/lib/api";
import { pluginInputFromApi, pluginJson } from "@/lib/serialize";
import { deletePlugin, getPlugin, updatePlugin } from "@/lib/services";
import { UserError } from "@/lib/types";

export const dynamic = "force-dynamic";
type P = { pluginId: string };

export const GET = apiRoute<P>((_req, { pluginId }) => {
  const plugin = getPlugin(pluginId);
  if (!plugin) throw new UserError("Plugin not found", 404);
  return json(pluginJson(plugin));
});

export const PATCH = apiRoute<P>(async (req, { pluginId }) => {
  const body = await readJson(req);
  const input = Object.fromEntries(Object.entries(pluginInputFromApi(body)).filter(([, v]) => v !== undefined));
  return json(pluginJson(updatePlugin(pluginId, input)));
});

export const DELETE = apiRoute<P>((_req, { pluginId }) => {
  deletePlugin(pluginId);
  return json({ deleted: true });
});
