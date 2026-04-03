import { describe, expect, it } from "vitest";

import { mergeSplitProtocolDocxPlaceholders } from "@/lib/attestation/fix-protocol-docx-xml";

describe("mergeSplitProtocolDocxPlaceholders", () => {
  it("merges split {members} and renames duplicate {#items} loops", () => {
    const xml = `<w:t>{member</w:t></w:r><w:r><w:t>s</w:t></w:r><w:r><w:t>}</w:t></w:r>
<w:t>{#items}</w:t>inner<w:t>{/items}</w:t><w:t>{#items}</w:t>sig<w:t>{/items}</w:t>`;
    const out = mergeSplitProtocolDocxPlaceholders(xml);
    expect(out).toMatch(/\{members\}/);
    expect(out).toContain("inner");
    expect(out).not.toContain("{#items}");
    expect(out).toContain("{#commissionMembers}");
    expect(out).toContain("{/commissionMembers}");
  });
});
