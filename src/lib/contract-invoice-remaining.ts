import { sql } from "drizzle-orm";

import { db } from "@/db";

export type ContractLineInvoiceRemaining = {
  id: string;
  title: string;
  unit: string;
  contractQuantity: number;
  price: number;
  invoicedQuantity: number;
  remaining: number;
};

/** Contract line rows (invoice_id is null) with quantities already invoiced via source_contract_line_item_id. */
export async function getContractLinesWithRemainingForInvoicing(
  contractId: string,
  options?: { excludeInvoiceId?: string },
): Promise<ContractLineInvoiceRemaining[]> {
  const excludeInvoiceId = options?.excludeInvoiceId;
  const excludeFilter =
    excludeInvoiceId != null && excludeInvoiceId !== ""
      ? sql`and ili.invoice_id <> ${excludeInvoiceId}`
      : sql``;

  const result = await db.execute<{
    id: string;
    title: string;
    unit: string;
    contract_quantity: string;
    price: string;
    invoiced_sum: string;
  }>(sql`
    select
      cli.id,
      cli.title,
      cli.unit,
      cli.quantity::text as contract_quantity,
      cli.price::text as price,
      coalesce((
        select sum(ili.quantity)
        from line_items ili
        where ili.source_contract_line_item_id = cli.id
          and ili.invoice_id is not null
          ${excludeFilter}
      ), 0)::text as invoiced_sum
    from line_items cli
    where cli.contract_id = ${contractId}
      and cli.invoice_id is null
    order by cli.created_at
  `);

  return result.rows.map((r) => {
    const cq = Number(r.contract_quantity);
    const used = Number(r.invoiced_sum);
    return {
      id: r.id,
      title: r.title,
      unit: r.unit,
      contractQuantity: cq,
      price: Number(r.price),
      invoicedQuantity: used,
      remaining: Math.max(0, cq - used),
    };
  });
}
