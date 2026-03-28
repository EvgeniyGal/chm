import { redirect } from "next/navigation";

import { requireRole } from "@/lib/authz";

/** Former contract «view» page — list + edit are the primary flows. */
export default async function ContractIdRedirectPage() {
  await requireRole("MANAGER");
  redirect("/contracts");
}
