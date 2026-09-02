import { peekInvoiceNumber } from "@/db/numbering";
import { requireRole } from "@/lib/authz";

export const runtime = "nodejs";

export async function GET(req: Request) {
  await requireRole("ADMIN");
  const url = new URL(req.url);
  const dateStr = url.searchParams.get("date");
  if (!dateStr?.trim()) {
    return Response.json({ error: "MISSING_DATE" }, { status: 400 });
  }
  const at = new Date(`${dateStr.trim()}T00:00:00.000Z`);
  if (Number.isNaN(at.getTime())) {
    return Response.json({ error: "INVALID_DATE" }, { status: 400 });
  }
  const contractId = url.searchParams.get("contractId")?.trim() || null;
  const number = await peekInvoiceNumber({ at, contractId });
  return Response.json({ data: { number } });
}
