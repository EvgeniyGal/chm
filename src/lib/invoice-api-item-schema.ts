import { z } from "zod";

/** Client forms send quantity/price as strings; JSON may use comma decimals. */
function parseNonNegativeDecimal(v: unknown): number {
  if (typeof v === "number" && Number.isFinite(v)) return Math.max(0, v);
  if (typeof v === "string") {
    const n = Number.parseFloat(v.replace(",", ".").replace(/\s/g, "").trim());
    if (Number.isFinite(n)) return Math.max(0, n);
  }
  return Number.NaN;
}

export const invoiceApiLineItemSchema = z.object({
  title: z.string().min(1),
  unit: z.string().min(1),
  quantity: z.preprocess((v) => parseNonNegativeDecimal(v), z.number().min(0)),
  price: z.preprocess((v) => parseNonNegativeDecimal(v), z.number().min(0)),
  sourceContractLineItemId: z.preprocess(
    (v) => (v === "" || v === undefined ? null : v),
    z.union([z.null(), z.string().uuid()]),
  ),
});
