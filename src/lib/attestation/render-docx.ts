import Docxtemplater from "docxtemplater";
import PizZip from "pizzip";

export function renderDocxTemplate(templateBuffer: Buffer, data: Record<string, unknown>): Buffer {
  const zip = new PizZip(templateBuffer);
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
