import { eq } from "drizzle-orm";

import { SignedUpload } from "@/components/uploads/SignedUpload";
import { db } from "@/db";
import { contracts } from "@/db/schema";
import { requireRole } from "@/lib/authz";
import { getSignedScansForEntity } from "@/lib/signed-scans";

export default async function ContractScansPage({ params }: { params: Promise<{ id: string }> }) {
  await requireRole("MANAGER");
  const { id } = await params;

  const contract = await db.query.contracts.findFirst({
    where: eq(contracts.id, id),
    columns: { id: true, number: true },
  });

  if (!contract) {
    return <div className="text-sm text-muted-foreground">Договір не знайдено.</div>;
  }

  const signedScansInitial = await getSignedScansForEntity("CONTRACT", id);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-end justify-between gap-3">
        <h1 className="page-title">Скани договору {contract.number}</h1>
        <a className="rounded-md border px-3 py-2 text-sm hover:bg-accent" href="/contracts">
          До списку договорів
        </a>
      </div>
      <SignedUpload entityType="CONTRACT" entityId={id} initialScans={signedScansInitial} />
    </div>
  );
}
