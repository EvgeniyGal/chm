import { revalidatePath } from "next/cache";

export function revalidateContractPages(contractId?: string) {
  revalidatePath("/contracts");
  revalidatePath("/contracts/new");
  if (contractId) revalidatePath(`/contracts/${contractId}/edit`);
}

export function revalidateInvoicePages(opts?: { invoiceId?: string; contractId?: string | null }) {
  revalidatePath("/invoices");
  revalidatePath("/invoices/new");
  if (opts?.invoiceId) revalidatePath(`/invoices/${opts.invoiceId}/edit`);
  if (opts?.contractId) revalidatePath(`/contracts/${opts.contractId}/edit`);
}

export function revalidateAcceptanceActPages(opts?: { actId?: string; invoiceId?: string }) {
  revalidatePath("/acceptance-acts");
  revalidatePath("/acceptance-acts/new");
  if (opts?.actId) revalidatePath(`/acceptance-acts/${opts.actId}`);
  if (opts?.invoiceId) revalidatePath(`/invoices/${opts.invoiceId}/edit`);
}
