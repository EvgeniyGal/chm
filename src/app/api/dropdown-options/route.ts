import { z } from "zod";

import { deleteDropdownOptions, saveDropdownOption } from "@/lib/dropdown-options";
import { requireRole } from "@/lib/authz";

export const runtime = "nodejs";

const scopeSchema = z.enum([
  "TAX_STATUS",
  "SIGNER_POSITION_NOM",
  "SIGNER_POSITION_GEN",
  "ACTING_UNDER",
  "SIGNING_LOCATION",
]);
const bodySchema = z.object({
  scope: scopeSchema,
  value: z.string().min(1),
});

export async function POST(req: Request) {
  await requireRole("ADMIN");
  const json = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return Response.json({ error: "VALIDATION_ERROR" }, { status: 400 });
  }
  await saveDropdownOption(parsed.data.scope, parsed.data.value);
  return Response.json({ ok: true });
}

export async function DELETE(req: Request) {
  await requireRole("ADMIN");
  const json = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return Response.json({ error: "VALIDATION_ERROR" }, { status: 400 });
  }
  await deleteDropdownOptions(parsed.data.scope, [parsed.data.value]);
  return Response.json({ ok: true });
}

