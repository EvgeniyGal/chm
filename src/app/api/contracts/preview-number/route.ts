import { peekNextDocumentNumber } from "@/db/numbering";
import { requireRole } from "@/lib/authz";

export const runtime = "nodejs";

export async function GET(req: Request) {
  await requireRole("ADMIN");
  const dateStr = new URL(req.url).searchParams.get("date");
  if (!dateStr?.trim()) {
    return Response.json({ error: "MISSING_DATE" }, { status: 400 });
  }
  const at = new Date(`${dateStr.trim()}T00:00:00.000Z`);
  if (Number.isNaN(at.getTime())) {
    return Response.json({ error: "INVALID_DATE" }, { status: 400 });
  }
  const number = await peekNextDocumentNumber({ documentType: "CONTRACT", at });
  return Response.json({ data: { number } });
}
