import { json } from "@/lib/api";
import { handleTebex } from "@/lib/tebex";

export const dynamic = "force-dynamic";

/** Tebex webhook endpoint: creates licenses on payment.completed and emails them to the buyer. */
export async function POST(req: Request) {
  const raw = await req.text();
  try {
    const result = await handleTebex(raw, req.headers.get("x-signature"));
    return json(result.body, result.status);
  } catch (err) {
    console.error("tebex webhook failed", err);
    return json({ error: "Internal server error" }, 500);
  }
}
