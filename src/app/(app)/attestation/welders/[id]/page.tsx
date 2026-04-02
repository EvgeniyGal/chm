import { redirect } from "next/navigation";

import { requireRole } from "@/lib/authz";

/** Картка зварника знята — дії перенесені в список «Зварники». */
export default async function WelderCertificationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireRole("MANAGER");
  await params;
  redirect("/attestation/welders");
}
