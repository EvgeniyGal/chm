import PizZip from "pizzip";

/**
 * Word розбиває текст на кілька <w:t>, тож docxtemplater не бачить цілісних `{placeholder}`.
 * Об’єднує послідовні <w:r> у межах <w:p>, якщо їхній текст разом утворює один фрагмент `{...}`.
 */
export function mergeSplitPlaceholdersInDocumentXml(documentXml: string): string {
  return documentXml.replace(/<w:p\b[^>]*>[\s\S]*?<\/w:p>/g, mergeParagraphPlaceholders);
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

type Token = { type: "other"; xml: string } | { type: "r"; xml: string; text: string };

function mergeParagraphPlaceholders(para: string): string {
  if (!para.includes("<w:t")) return para;

  const openTagMatch = para.match(/^<w:p\b[^>]*>/);
  const openTag = openTagMatch?.[0] ?? "";
  if (!para.endsWith("</w:p>")) return para;
  let innerLoop = para.slice(openTag.length, -"</w:p>".length);

  let changed = false;
  for (let iter = 0; iter < 200; iter++) {
    const tokens = tokenizeParagraphInner(innerLoop);
    const runIndices = tokens
      .map((t, i) => (t.type === "r" ? i : -1))
      .filter((i) => i >= 0);

    const runTexts = runIndices.map((i) => (tokens[i] as { type: "r"; text: string }).text);
    if (runTexts.length === 0) break;

    const full = runTexts.join("");
    const matches = [...full.matchAll(/\{[^}]+\}/g)];

    const cum: number[] = [0];
    for (const t of runTexts) {
      cum.push(cum[cum.length - 1] + t.length);
    }

    let rep: { startRun: number; endRun: number; value: string } | null = null;
    for (const m of matches) {
      const s = m.index ?? 0;
      const e = s + m[0].length;
      const startRun = findRunIndex(cum, s);
      const endRun = findRunIndex(cum, e - 1);
      if (startRun !== endRun) {
        rep = { startRun, endRun, value: m[0] };
        break;
      }
    }

    if (!rep) break;

    const ti = runIndices[rep.startRun];
    const tj = runIndices[rep.endRun];
    const firstR = (tokens[ti] as { type: "r"; xml: string }).xml;
    const merged = toSingleTextRun(firstR, rep.value);
    const nextTokens = [...tokens.slice(0, ti), { type: "r" as const, xml: merged, text: rep.value }, ...tokens.slice(tj + 1)];
    innerLoop = nextTokens.map((t) => t.xml).join("");
    changed = true;
  }

  if (!changed) return para;
  return `${openTag}${innerLoop}</w:p>`;
}

function findRunIndex(cum: number[], charPos: number): number {
  for (let i = 0; i < cum.length - 1; i++) {
    if (charPos >= cum[i] && charPos < cum[i + 1]) return i;
  }
  return Math.max(0, cum.length - 2);
}

function tokenizeParagraphInner(inner: string): Token[] {
  const tokens: Token[] = [];
  let pos = 0;
  while (pos < inner.length) {
    const rest = inner.slice(pos);
    const rMatch = rest.match(/^<w:r\b[\s\S]*?<\/w:r>/);
    if (rMatch) {
      const rXml = rMatch[0];
      const texts = [...rXml.matchAll(/<w:t[^>]*>([^<]*)<\/w:t>/g)].map((m) => m[1]);
      tokens.push({ type: "r", xml: rXml, text: texts.join("") });
      pos += rXml.length;
    } else {
      const nextR = inner.indexOf("<w:r", pos + 1);
      const end = nextR === -1 ? inner.length : nextR;
      tokens.push({ type: "other", xml: inner.slice(pos, end) });
      pos = end;
    }
  }
  return tokens;
}

function toSingleTextRun(rXml: string, newText: string): string {
  const open = rXml.match(/^<w:r\b[^>]*>/)?.[0];
  if (!open) return rXml;
  const rPr = rXml.match(/<w:rPr>[\s\S]*?<\/w:rPr>/)?.[0] ?? "";
  return `${open}${rPr}<w:t>${escapeXml(newText)}</w:t></w:r>`;
}

/**
 * Застосовує об’єднання до всіх частин документа з `<w:t>` (body, headers/footers).
 */
export function mergeSplitPlaceholdersInDocxBuffer(templateBuffer: Buffer): Buffer {
  const zip = new PizZip(templateBuffer);
  for (const name of Object.keys(zip.files)) {
    if (!name.startsWith("word/") || !name.endsWith(".xml") || name.includes("_rels")) continue;
    const entry = zip.files[name];
    if (!entry || entry.dir) continue;
    const content = entry.asText();
    if (!content.includes("<w:t")) continue;
    zip.file(name, mergeSplitPlaceholdersInDocumentXml(content));
  }
  return zip.generate({ type: "nodebuffer", compression: "DEFLATE" }) as Buffer;
}
