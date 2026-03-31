import { eq } from "drizzle-orm";

import { SignedUpload } from "@/components/uploads/SignedUpload";
import { db } from "@/db";
import { invoices } from "@/db/schema";
import { requireRole } from "@/lib/authz";
import { getSignedScansForEntity } from "@/lib/signed-scans";

export default async function InvoiceScansPage({ params }: { params: Promise<{ id: string }> }) {
  await requireRole("MANAGER");
  const { id } = await params;

  const invoice = await db.query.invoices.findFirst({
    where: eq(invoices.id, id),
    columns: { id: true, number: true },
  });
  if (!invoice) return <div className="text-sm text-muted-foreground">Рахунок не знайдено.</div>;

  const signedScansInitial = await getSignedScansForEntity("INVOICE", id);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-end justify-between gap-3">
        <h1 className="page-title">Скани рахунку {invoice.number}</h1>
        <a className="rounded-md border px-3 py-2 text-sm hover:bg-accent" href="/invoices">
          До списку рахунків
        </a>
      </div>
      <SignedUpload entityType="INVOICE" entityId={id} initialScans={signedScansInitial} />
    </div>
  );
}
