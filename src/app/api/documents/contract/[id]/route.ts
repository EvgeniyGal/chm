import { eq } from "drizzle-orm";

import { db } from "@/db";
import { companies, contracts, lineItems } from "@/db/schema";
import { requireRole } from "@/lib/authz";
import { buildTreatyDocxBuffer } from "@/lib/treaty-docx";

export const runtime = "nodejs";

export async function GET(req: Request, ctx: RouteContext<"/api/documents/contract/[id]">) {
  await requireRole("MANAGER");
  const { id } = await ctx.params;
  const url = new URL(req.url);
  const variant = url.searchParams.get("variant") === "short" ? "short" : "full";

  const contract = await db.query.contracts.findFirst({ where: eq(contracts.id, id) });
  if (!contract) return Response.json({ error: "NOT_FOUND" }, { status: 404 });
  const [customer, contractor] = await Promise.all([
    db.query.companies.findFirst({ where: eq(companies.id, contract.customerCompanyId) }),
    db.query.companies.findFirst({ where: eq(companies.id, contract.contractorCompanyId) }),
  ]);
  if (!customer || !contractor) return Response.json({ error: "COMPANY_NOT_FOUND" }, { status: 404 });

  const items = await db.query.lineItems.findMany({ where: eq(lineItems.contractId, id) });
  if (items.length === 0) return Response.json({ error: "NO_LINE_ITEMS" }, { status: 400 });

  const buffer = buildTreatyDocxBuffer({
    variant,
    workType: contract.workType,
    contractNumber: contract.number,
    date: new Date(contract.date).toISOString().slice(0, 10),
    signingLocation: contract.signingLocation,
    projectTimeline: contract.projectTimeline,
    contractDuration: contract.contractDuration,
    signerFullNameNom: contract.signerFullNameNom,
    signerFullNameGen: contract.signerFullNameGen,
    signerPositionNom: contract.signerPositionNom,
    signerPositionGen: contract.signerPositionGen,
    signerActingUnder: contract.signerActingUnder,
    items: items.map((it) => ({
      title: it.title,
      unit: it.unit,
      quantity: Number.parseFloat(String(it.quantity)) || 0,
      price: Number.parseFloat(String(it.price)) || 0,
    })),
    customer,
    contractor,
  });

  const safeNumber = contract.number.replaceAll(/[^\w.\-]+/g, "_").replaceAll(/_+/g, "_");
  const filename = `treaty-${variant}-${contract.workType === "WORKS" ? "work" : "service"}-${safeNumber}.docx`;

  return new Response(new Uint8Array(buffer), {
    headers: {
      "content-type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "content-disposition": `attachment; filename="${filename}"`,
    },
  });
}

