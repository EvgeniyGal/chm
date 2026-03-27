import { eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import { companies } from "@/db/schema";
import { requireRole } from "@/lib/authz";
import { buildTreatyDocxBuffer } from "@/lib/treaty-docx";

export const runtime = "nodejs";

const itemSchema = z.object({
  title: z.string().min(1),
  unit: z.string().min(1),
  quantity: z.number().min(0),
  price: z.number().min(0),
});

const bodySchema = z
  .object({
    variant: z.enum(["full", "short"]),
    contractNumber: z.string().optional(),
    date: z.string().min(1),
    signingLocation: z.string().min(1),
    workType: z.enum(["WORKS", "SERVICES"]),
    customerCompanyId: z.string().uuid(),
    contractorCompanyId: z.string().uuid(),
    projectTimeline: z.string().min(1),
    contractDuration: z.string().min(1),
    signerFullNameNom: z.string().min(1),
    signerFullNameGen: z.string().min(1),
    signerPositionNom: z.string().min(1),
    signerPositionGen: z.string().min(1),
    signerActingUnder: z.string().min(1),
    items: z.array(itemSchema).min(1),
  })
  .refine((data) => data.customerCompanyId !== data.contractorCompanyId, {
    message: "CUSTOMER_AND_CONTRACTOR_SAME",
    path: ["contractorCompanyId"],
  });

export async function POST(req: Request) {
  await requireRole("ADMIN");

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return Response.json({ error: "INVALID_JSON" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return Response.json({ error: "VALIDATION_ERROR", details: parsed.error.flatten() }, { status: 400 });
  }

  const data = parsed.data;

  const [customer, contractor] = await Promise.all([
    db.query.companies.findFirst({ where: eq(companies.id, data.customerCompanyId) }),
    db.query.companies.findFirst({ where: eq(companies.id, data.contractorCompanyId) }),
  ]);

  if (!customer || !contractor) {
    return Response.json({ error: "COMPANY_NOT_FOUND" }, { status: 404 });
  }

  const number = String(data.contractNumber ?? "—").trim() || "—";

  try {
    const buffer = buildTreatyDocxBuffer({
      variant: data.variant,
      workType: data.workType,
      contractNumber: number,
      date: data.date,
      signingLocation: data.signingLocation,
      projectTimeline: data.projectTimeline,
      contractDuration: data.contractDuration,
      signerFullNameNom: data.signerFullNameNom,
      signerFullNameGen: data.signerFullNameGen,
      signerPositionNom: data.signerPositionNom,
      signerPositionGen: data.signerPositionGen,
      signerActingUnder: data.signerActingUnder,
      items: data.items,
      customer,
      contractor,
    });

    const safe = number.replaceAll(/[^\w.\-]+/g, "_").replaceAll(/_+/g, "_");
    const filename = `treaty-${data.variant}-${data.workType === "WORKS" ? "work" : "service"}-${safe}.docx`;

    return new Response(new Uint8Array(buffer), {
      headers: {
        "content-type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "content-disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (e) {
    console.error(e);
    return Response.json({ error: "GENERATE_FAILED" }, { status: 500 });
  }
}
