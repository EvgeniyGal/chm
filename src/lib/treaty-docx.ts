import { readFileSync } from "fs";
import path from "path";

import Docxtemplater from "docxtemplater";
import PizZip from "pizzip";

import type { companies } from "@/db/schema";
import { calcRowTotal, calcTotals, formatMoney } from "@/lib/totals";
import { uahContractPriceLiteral } from "@/lib/uk-amount-words";

export type CompanyRow = typeof companies.$inferSelect;

function formatCompanyDetails(c: CompanyRow): string {
  const lines = [
    `Адреса: ${c.address}`,
    `ЄДРПОУ: ${c.edrpouCode}`,
    c.vatIdTin ? `ІПН: ${c.vatIdTin}` : null,
    `Банк: ${c.bank}`,
    `IBAN: ${c.iban}`,
  ].filter(Boolean);
  return lines.join("\n");
}

export type TreatyGeneratePayload = {
  variant: "full" | "short";
  workType: "WORKS" | "SERVICES";
  /** Shown in header; use "—" for unsaved draft. */
  contractNumber: string;
  date: string;
  signingLocation: string;
  projectTimeline: string;
  contractDuration: string;
  signerFullNameNom: string;
  signerFullNameGen: string;
  signerPositionNom: string;
  signerPositionGen: string;
  signerActingUnder: string;
  items: Array<{ title: string; unit: string; quantity: number; price: number }>;
  customer: CompanyRow;
  contractor: CompanyRow;
};

export function buildTreatyDocxBuffer(input: TreatyGeneratePayload): Buffer {
  const templateName = `treaty-${input.variant}-${input.workType === "WORKS" ? "work" : "service"}.docx`;
  const templatePath = path.join(process.cwd(), "forms", templateName);
  const buf = readFileSync(templatePath);
  const zip = new PizZip(buf);
  const docEntry = zip.file("word/document.xml");
  if (!docEntry) {
    throw new Error("MISSING_DOCUMENT_XML");
  }
  const totals = calcTotals(input.items);
  const dateObj = new Date(input.date);
  const dateStr = Number.isNaN(dateObj.getTime())
    ? input.date
    : dateObj.toLocaleDateString("uk-UA") ?? input.date;

  const rowItems = input.items.map((it, i) => {
    const rowTotal = calcRowTotal(it);
    return {
      "treaty-job-item-number": String(i + 1),
      "treaty-job-item-title": it.title,
      "treaty-job-item-unit": it.unit,
      "treaty-job-item-quantity": formatMoney(it.quantity),
      "treaty-job-item-price": formatMoney(it.price),
      "treaty-job-item-total-price": formatMoney(rowTotal),
    };
  });

  const data: Record<string, unknown> = {
    "treaty-number": input.contractNumber,
    "treaty-place": input.signingLocation,
    "treaty-date": dateStr,
    "treaty-header-customer": input.customer.fullName,
    "treaty-header-customer-tax-status": input.customer.taxStatus,
    "treaty-header-customer-person": input.customer.contractSignerFullNameGen,
    "treaty-header-customer-person-mandate": input.customer.contractSignerActingUnder,
    "treaty-header-contractor": input.contractor.fullName,
    "treaty-header-contractor-tax-status": input.contractor.taxStatus,
    "treaty-header-contractor-person": input.signerFullNameGen,
    "treaty-header-contractor-person-mandate": input.signerActingUnder,
    items: rowItems,
    "treaty-jobs-price-without-tax": formatMoney(totals.totalWithoutVat),
    "treaty-jobs-tax": formatMoney(totals.vat20),
    "treaty-jobs-price-with-tax": formatMoney(totals.totalWithVat),
    "treaty-price-literal": uahContractPriceLiteral(totals.totalWithVat, totals.vat20),
    "treaty-job-duration": input.projectTimeline,
    "treaty-duration": input.contractDuration,
    "treaty-sign-contractor": input.contractor.shortName,
    "treaty-sign-customer": input.customer.shortName,
    "treaty-contractor-details": formatCompanyDetails(input.contractor),
    "treaty-customer-details": formatCompanyDetails(input.customer),
    "treaty-sign-contractor-position": input.signerPositionNom,
    "treaty-sign-contractor-person": input.signerFullNameNom,
    "treaty-sign-customer-position": input.customer.contractSignerPositionNom,
    "treaty-sign-customer-person": input.customer.contractSignerFullNameNom,
  };

  const doc = new Docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks: true,
  });
  doc.render(data);
  // Use DEFLATE like Word; avoid ad-hoc XML "merge" passes that break w:r/w:t balance (Word then refuses to open).
  return doc.getZip().generate({
    type: "nodebuffer",
    compression: "DEFLATE",
  }) as Buffer;
}
