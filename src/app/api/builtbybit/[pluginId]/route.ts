import { safeDecode } from "@/lib/api";
import { builtByBitResponse } from "@/lib/builtbybitRoute";

export const dynamic = "force-dynamic";

/** Each plugin's own BuiltByBit "External license key" placeholder URL. */
export async function POST(req: Request, ctx: { params: Promise<{ pluginId: string }> }) {
  const { pluginId } = await ctx.params;
  return builtByBitResponse(req, safeDecode(pluginId));
}
