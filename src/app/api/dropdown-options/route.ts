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
  "PROJECT_TIMELINE",
  "CONTRACT_DURATION",
  "LINE_ITEM_UNIT",
  "CERTIFICATE_ISSUE_LOCATION",
]);
const bodySchema = z.object({
  scope: scopeSchema,
  value: z.string().min(1),
});

async function requireRoleForDropdownScope(scope: string) {
  if (scope === "CERTIFICATE_ISSUE_LOCATION") {
    await requireRole("MANAGER");
  } else {
    await requireRole("ADMIN");
  }
}

export async function POST(req: Request) {
  const json = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return Response.json({ error: "VALIDATION_ERROR" }, { status: 400 });
  }
  await requireRoleForDropdownScope(parsed.data.scope);
  await saveDropdownOption(parsed.data.scope, parsed.data.value);
  return Response.json({ ok: true });
}

export async function DELETE(req: Request) {
  const json = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return Response.json({ error: "VALIDATION_ERROR" }, { status: 400 });
  }
  await requireRoleForDropdownScope(parsed.data.scope);
  await deleteDropdownOptions(parsed.data.scope, [parsed.data.value]);
  return Response.json({ ok: true });
}

