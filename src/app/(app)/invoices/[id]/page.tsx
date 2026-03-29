import { redirect } from "next/navigation";

import { requireRole } from "@/lib/authz";

/** Колишня сторінка перегляду — основний потік: список і редагування. */
export default async function InvoiceIdRedirectPage() {
  await requireRole("MANAGER");
  redirect("/invoices");
}
