import { readFileSync } from "fs";
import path from "path";

import Docxtemplater from "docxtemplater";
import PizZip from "pizzip";

import type { acceptanceActs, companies, invoices } from "@/db/schema";
import { calcRowTotal, formatMoney } from "@/lib/totals";
import { uahContractPriceLiteral } from "@/lib/uk-amount-words";

type ActRow = typeof acceptanceActs.$inferSelect;
type InvoiceRow = typeof invoices.$inferSelect;
type CompanyRow = typeof companies.$inferSelect;

export type AcceptanceActDocxInput = {
  act: ActRow;
  invoice: InvoiceRow;
  customer: CompanyRow;
  contractor: CompanyRow;
  linkedContract?: { number: string; date: Date } | null;
  items: Array<{ title: string; unit: string; quantity: number; price: number }>;
};

function resolveTreatyBasis(input: AcceptanceActDocxInput): {
  treatyWord: "договором" | "рахунком";
  treatyNumber: string;
  treatyDate: string;
} {
  if (input.linkedContract) {
    return {
      treatyWord: "договором",
      treatyNumber: input.linkedContract.number,
      treatyDate: new Date(input.linkedContract.date).toLocaleDateString("uk-UA"),
    };
  }

  if (input.invoice.isExternalContract && input.invoice.externalContractNumber) {
    return {
      treatyWord: "договором",
      treatyNumber: input.invoice.externalContractNumber,
      treatyDate: input.invoice.externalContractDate
        ? new Date(input.invoice.externalContractDate).toLocaleDateString("uk-UA")
        : "—",
    };
  }

  return {
    treatyWord: "рахунком",
    treatyNumber: input.invoice.number,
    treatyDate: new Date(input.invoice.date).toLocaleDateString("uk-UA"),
  };
}

export function buildAcceptanceActDocxBuffer(input: AcceptanceActDocxInput): Buffer {
  const wt = input.invoice.workType === "WORKS" ? "work" : "service";
  const templatePath = path.join(process.cwd(), "forms", `act-${wt}.docx`);
  const zip = new PizZip(readFileSync(templatePath));

  const basis = resolveTreatyBasis(input);
  const actDate = new Date(input.act.date).toLocaleDateString("uk-UA");

  const rowItems = input.items.map((it, i) => ({
    "act-job-item-number": String(i + 1),
    "act-job-item-title": it.title,
    "act-job-item-unit": it.unit,
    "act-job-item-quantity": formatMoney(it.quantity),
    "act-job-item-price": formatMoney(it.price),
    "act-job-item-total-price": formatMoney(calcRowTotal(it)),
  }));

  const vatNum = Number(input.act.vat20);
  const totalWithNum = Number(input.act.totalWithVat);

  const data: Record<string, unknown> = {
    "act-number": input.act.number,
    "act-date": actDate,
    "act-place": input.act.signingLocation,
    "act-header-contractor": input.contractor.fullName,
    "act-header-customer": input.customer.fullName,
    "act-treaty": basis.treatyWord,
    "act-treaty-number": basis.treatyNumber,
    "act-treaty-date": basis.treatyDate,
    items: rowItems,
    "act-jobs-price-without-tax": formatMoney(Number(input.act.totalWithoutVat)),
    "act-jobs-tax": formatMoney(vatNum),
    "act-jobs-price-with-tax": formatMoney(totalWithNum),
    "act-price-literal": uahContractPriceLiteral(totalWithNum, vatNum),
    "act-sign-contractor": input.contractor.shortName,
    "act-sign-customer": input.customer.shortName,
    "act-sign-contractor-position": input.act.signerPositionNom,
    "act-sign-contractor-person": input.act.signerFullNameNom,
    "act-sign-customer-position": input.customer.actSignerPositionNom,
    "act-sign-customer-person": input.customer.actSignerFullNameNom,
  };

  const doc = new Docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks: true,
  });
  doc.render(data);
  return doc.getZip().generate({
    type: "nodebuffer",
    compression: "DEFLATE",
  }) as Buffer;
}

