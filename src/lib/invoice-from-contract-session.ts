/** sessionStorage key for partial line selection when creating an invoice from a contract. */
export function invoicePartialSelectionStorageKey(contractId: string) {
  return `chm_invoice_partial_v1:${contractId}`;
}
