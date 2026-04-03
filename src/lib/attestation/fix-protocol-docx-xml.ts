import PizZip from "pizzip";

/**
 * Word розбиває текст на кілька <w:t>, через що docxtemplater не бачить цілісних `{placeholder}`.
 * Об’єднує відомі розбиті теги з `forms/protocol.docx` у один фрагмент.
 */
export function mergeSplitProtocolDocxPlaceholders(documentXml: string): string {
  let xml = documentXml;

  const merges: [RegExp, string][] = [
    [
      /<w:t>\{<\/w:t><\/w:r><w:r[^>]*>[\s\S]*?<w:t>full<\/w:t><\/w:r><w:r[^>]*>[\s\S]*?<w:t>-name\}<\/w:t><\/w:r>/g,
      "<w:r><w:t>{full-name}</w:t></w:r>",
    ],
    [
      /<w:t>\{birth-year-<\/w:t><\/w:r><w:r[^>]*>[\s\S]*?<w:t>location<\/w:t><\/w:r><w:r[^>]*>[\s\S]*?<w:t>\}<\/w:t><\/w:r>/g,
      "<w:r><w:t>{birth-year-location}</w:t></w:r>",
    ],
    [
      /<w:t>\{member<\/w:t><\/w:r><w:r[^>]*>[\s\S]*?<w:t>s<\/w:t><\/w:r><w:r[^>]*>[\s\S]*?<w:t>\}<\/w:t><\/w:r>/g,
      "<w:r><w:t>{members}</w:t></w:r>",
    ],
    [
      /<w:t>\{standards-list<\/w:t><\/w:r><w:r[^>]*>[\s\S]*?<w:t>-<\/w:t><\/w:r><w:r[^>]*>[\s\S]*?<w:t>admission<\/w:t><\/w:r><w:r[^>]*>[\s\S]*?<w:t>\}<\/w:t><\/w:r>/g,
      "<w:r><w:t>{standards-list-admission}</w:t></w:r>",
    ],
  ];

  for (const [re, repl] of merges) {
    xml = xml.replace(re, repl);
  }

  xml = renameSecondItemsLoopOnly(xml);
  xml = flattenFirstInspectionItemsLoop(xml);
  xml = xml.replace(
    /<w:t>\{inspection<\/w:t><\/w:r><w:r[^>]*>[\s\S]*?<w:t>-order-number<\/w:t><\/w:r><w:r[^>]*>[\s\S]*?<w:t>\}<\/w:t><\/w:r>/g,
    "<w:r><w:t>{inspection-order-number}</w:t></w:r>",
  );

  return xml;
}

/** Перший `{#items}` (рядок контролю якості) — прибираємо цикл; поля `inspection-order-number` / `inspection` на корені payload. */
function flattenFirstInspectionItemsLoop(xml: string): string {
  const open = "<w:t>{#items}</w:t>";
  const close = "<w:t>{/items}</w:t>";
  const i1 = xml.indexOf(open);
  if (i1 === -1) return xml;
  const c1 = xml.indexOf(close, i1);
  if (c1 === -1) return xml;
  const inner = xml.slice(i1 + open.length, c1);
  return xml.slice(0, i1) + inner + xml.slice(c1 + close.length);
}

/**
 * Другий `{#items}` у шаблоні — підписи членів → `{#commissionMembers}`.
 */
function renameSecondItemsLoopOnly(xml: string): string {
  const open = "{#items}";
  const close = "{/items}";
  const firstOpen = xml.indexOf(open);
  if (firstOpen === -1) return xml;
  const firstClose = xml.indexOf(close, firstOpen);
  if (firstClose === -1) return xml;
  const secondOpen = xml.indexOf(open, firstOpen + open.length);
  if (secondOpen === -1) return xml;
  const secondClose = xml.indexOf(close, secondOpen);
  if (secondClose === -1) return xml;
  const secondBlock = xml.slice(secondOpen, secondClose + close.length);
  const fixed = secondBlock.replace(open, "{#commissionMembers}").replace(close, "{/commissionMembers}");
  return xml.slice(0, secondOpen) + fixed + xml.slice(secondClose + close.length);
}

export function applyProtocolDocxXmlFixes(templateBuffer: Buffer): Buffer {
  const zip = new PizZip(templateBuffer);
  const path = "word/document.xml";
  const file = zip.file(path);
  if (!file) return templateBuffer;
  const xml = file.asText();
  const fixed = mergeSplitProtocolDocxPlaceholders(xml);
  zip.file(path, fixed);
  return zip.generate({ type: "nodebuffer", compression: "DEFLATE" }) as Buffer;
}
