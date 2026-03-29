import { auditActionLabelUa } from "@/lib/contract-audit-history";
import { loadInvoiceAuditHistory } from "@/lib/invoice-audit-history";

export async function InvoiceAuditHistory({ invoiceId }: { invoiceId: string }) {
  const rows = await loadInvoiceAuditHistory(invoiceId);

  return (
    <section className="rounded-xl border bg-white" aria-labelledby="invoice-audit-heading">
      <div className="border-b bg-crm-table-header px-4 py-3">
        <h2 id="invoice-audit-heading" className="text-sm font-semibold text-foreground/90">
          Історія змін рахунку
        </h2>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Хто і коли змінював поля, позиції та скани підписаного документа.
        </p>
      </div>

      {rows.length === 0 ? (
        <div className="px-4 py-8 text-sm text-muted-foreground">Записів у журналі ще немає.</div>
      ) : (
        <ul className="divide-y">
          {rows.map((e) => (
            <li key={e.id} className="px-4 py-4">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="text-sm font-semibold text-foreground">{auditActionLabelUa(e.action)}</span>
                <time className="text-xs tabular-nums text-muted-foreground" dateTime={e.atIso}>
                  {new Date(e.atIso).toLocaleString("uk-UA")}
                </time>
              </div>
              <div className="mt-1 text-xs text-muted-foreground">Користувач: {e.actorLabel}</div>
              <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-foreground/90">
                {e.summaryLines.map((line, i) => (
                  <li key={i}>{line}</li>
                ))}
              </ul>
              <details className="mt-2">
                <summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground">
                  Технічні деталі (JSON)
                </summary>
                <pre className="mt-2 max-h-48 overflow-auto rounded-md bg-muted p-2 text-[11px] leading-snug text-foreground/80">
                  {e.diffJson}
                </pre>
              </details>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
