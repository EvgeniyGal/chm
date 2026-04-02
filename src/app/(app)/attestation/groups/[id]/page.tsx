import { redirect } from "next/navigation";

import { requireRole } from "@/lib/authz";

/** Картка групи знята — дії перенесені в список «Групи атестації». */
export default async function AttestationGroupDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireRole("MANAGER");
  await params;
  redirect("/attestation/groups");
}
