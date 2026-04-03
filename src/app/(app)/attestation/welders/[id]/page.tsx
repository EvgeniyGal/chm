import { redirect } from "next/navigation";

import { requireApprovedUser } from "@/lib/authz";

/** Картка зварника знята — дії перенесені в список «Зварники». */
export default async function WelderCertificationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireApprovedUser();
  await params;
  redirect("/attestation/welders");
}
