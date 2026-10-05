import { builtByBitResponse } from "@/lib/builtbybitRoute";

export const dynamic = "force-dynamic";

/** Older shared placeholder URL: the plugin is found from the BuiltByBit resource ID. */
export async function POST(req: Request) {
  return builtByBitResponse(req);
}
