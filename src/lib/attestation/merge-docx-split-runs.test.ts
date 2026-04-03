import { describe, expect, it } from "vitest";

import { mergeSplitPlaceholdersInDocumentXml } from "@/lib/attestation/merge-docx-split-runs";

describe("mergeSplitPlaceholdersInDocumentXml", () => {
  it("merges a placeholder split across multiple w:t runs", () => {
    const xml = `
<w:p xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
<w:r><w:rPr/><w:t>{first</w:t></w:r>
<w:r><w:rPr/><w:t>-name</w:t></w:r>
<w:r><w:rPr/><w:t>}</w:t></w:r>
</w:p>`.trim();
    const out = mergeSplitPlaceholdersInDocumentXml(xml);
    expect(out).toContain("<w:t>{first-name}</w:t>");
    expect(out).not.toMatch(/\{first<\/w:t>/);
  });

  it("leaves an already single-run placeholder unchanged", () => {
    const xml = `<w:p xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:r><w:t>{ok}</w:t></w:r></w:p>`;
    const out = mergeSplitPlaceholdersInDocumentXml(xml);
    expect(out).toContain("{ok}");
  });
});
