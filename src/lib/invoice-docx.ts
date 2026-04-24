import { readFileSync } from "fs";
import path from "path";

import Docxtemplater from "docxtemplater";
import PizZip from "pizzip";

import type { companies, invoices } from "@/db/schema";
import { calcRowTotal, formatMoney } from "@/lib/totals";
import { uahInvoicePriceLiteral } from "@/lib/uk-amount-words";

type InvoiceRow = typeof invoices.$inferSelect;
type CompanyRow = typeof companies.$inferSelect;

function formatContactsLine(contactsJson: string): string {
  try {
    const arr = JSON.parse(contactsJson) as { type: string; value: string }[];
    if (!Array.isArray(arr)) return "";
    return arr.map((c) => c.value).join(", ");
  } catch {
    return "";
  }
}

function formatCustomerContactsForInvoice(customer: CompanyRow): string {
  const contacts = formatContactsLine(customer.contacts);
  const registryLine = `ЄДРПОУ ${customer.edrpouCode}, ІПН ${customer.vatIdTin ?? "—"}`;
  return contacts ? `${contacts}, ${registryLine}` : registryLine;
}

type InvoiceDocxInput = {
  invoice: InvoiceRow;
  contractor: CompanyRow;
  customer: CompanyRow;
  items: Array<{ title: string; unit: string; quantity: number; price: number }>;
  /** Договір у базі, якщо рахунок прив’язаний. */
  linkedContract?: { number: string; date: Date } | null;
};

export function buildInvoiceDocxBuffer(input: InvoiceDocxInput): Buffer {
  const wt = input.invoice.workType === "WORKS" ? "work" : "service";
  const templateName = `invoice-${wt}.docx`;
  const templatePath = path.join(process.cwd(), "forms", templateName);
  const buf = readFileSync(templatePath);
  const zip = new PizZip(buf);

  const inv = input.invoice;
  const dateStr = new Date(inv.date).toLocaleDateString("uk-UA");

  const contractor = input.contractor;
  const customer = input.customer;

  let contractNumberDate = "—";
  if (input.linkedContract) {
    const cd = new Date(input.linkedContract.date).toLocaleDateString("uk-UA");
    contractNumberDate = `№ ${input.linkedContract.number} від ${cd}`;
  } else if (inv.isExternalContract && inv.externalContractNumber) {
    const ed = inv.externalContractDate
      ? new Date(inv.externalContractDate).toLocaleDateString("uk-UA")
      : "—";
    contractNumberDate = `№ ${inv.externalContractNumber} від ${ed}`;
  }

  const vatNum = Number(inv.vat20);
  const totalWithNum = Number(inv.totalWithVat);

  const rowItems = input.items.map((it, i) => ({
    "invoice-job-item-number": String(i + 1),
    "invoice-job-item-title": it.title,
    "invoice-job-item-unit": it.unit,
    "invoice-job-item-quantity": formatMoney(it.quantity),
    "invoice-job-item-price": formatMoney(it.price),
    "invoice-job-item-total-price": formatMoney(calcRowTotal(it)),
  }));

  const data: Record<string, unknown> = {
    "invoice-example-contractor-fullname": contractor.fullName,
    "invoice-example-contractor-cod-edrpou": contractor.edrpouCode,
    "invoice-example-contractor-bank": contractor.bank,
    "invoice-example-contractor-bank-account": contractor.iban,
    "invoice-number": inv.number,
    "invoice-date": dateStr,
    "invoice-contractor-fullname": contractor.fullName,
    "invoice-contractor-bank-account": contractor.iban,
    "invoice-contractor-bank": contractor.bank,
    "invoice-contractor-address": contractor.address,
    "invoice-contractor-contacts": formatContactsLine(contractor.contacts),
    "invoice-contractor-cod-edrpou": contractor.edrpouCode,
    "invoice-contractor-cod-tax": contractor.vatIdTin ?? "—",
    "invoice-customer-fullname": customer.fullName,
    "invoice-customer-contacts": formatCustomerContactsForInvoice(customer),
    "contract-number-date": contractNumberDate,
    items: rowItems,
    "invoice-jobs-price-without-tax": formatMoney(Number(inv.totalWithoutVat)),
    "invoice-jobs-tax": formatMoney(Number(inv.vat20)),
    "invoice-jobs-price-with-tax": formatMoney(Number(inv.totalWithVat)),
    "invoice-price-literal": uahInvoicePriceLiteral(totalWithNum, vatNum),
    "invoice-contractor-position": inv.signerPositionNom,
    "invoice-sign-contractor-person": inv.signerFullNameNom,
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
