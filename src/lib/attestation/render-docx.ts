import Docxtemplater from "docxtemplater";
import PizZip from "pizzip";

import { mergeSplitPlaceholdersInDocxBuffer } from "@/lib/attestation/merge-docx-split-runs";

/**
 * Як `buildTreatyDocxBuffer` / `buildInvoiceDocxBuffer`: PizZip → Docxtemplater → generate.
 * Перед рендером об’єднує розбиті Word’ом `{теги}` у цілісні — інакше docxtemplater не підставляє дані й може зіпсувати OOXML.
 */
export function renderDocxTemplate(templateBuffer: Buffer, data: Record<string, unknown>): Buffer {
  const zip = new PizZip(mergeSplitPlaceholdersInDocxBuffer(templateBuffer));
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
