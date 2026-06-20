import { eq } from "drizzle-orm";

import { SignedUpload } from "@/components/uploads/SignedUpload";
import { CrmButton } from "@/components/ui/crm-button";
import { db } from "@/db";
import { acceptanceActs } from "@/db/schema";
import { requireRole } from "@/lib/authz";
import { getSignedScansForEntity } from "@/lib/signed-scans";

export default async function AcceptanceActScansPage({ params }: { params: Promise<{ id: string }> }) {
  await requireRole("MANAGER");
  const { id } = await params;

  const act = await db.query.acceptanceActs.findFirst({
    where: eq(acceptanceActs.id, id),
    columns: { id: true, number: true },
  });
  if (!act) return <div className="text-sm text-muted-foreground">Акт не знайдено.</div>;

  const signedScansInitial = await getSignedScansForEntity("ACCEPTANCE_ACT", id);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-end justify-between gap-3">
        <h1 className="page-title">Скани акту {act.number}</h1>
        <CrmButton variant="neutral" href="/acceptance-acts">
          До списку актів
        </CrmButton>
      </div>
      <SignedUpload entityType="ACCEPTANCE_ACT" entityId={id} initialScans={signedScansInitial} />
    </div>
  );
}
