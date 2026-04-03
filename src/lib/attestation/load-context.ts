import { eq, inArray } from "drizzle-orm";

import { db } from "@/db";
import { companies } from "@/db/schema/companies";
import {
  certificationGroupMembers,
  certificationGroups,
  commissionMembers,
  regulatoryDocuments,
  sampleMaterials,
  weldingConsumables,
  welderCertificationRegulatoryDocuments,
  welderCertifications,
} from "@/db/schema/attestation";

import { formatCommissionMemberDocxLine, type WelderDocContext } from "@/lib/attestation/docx-payload";

export async function loadWelderDocContext(welderId: string): Promise<WelderDocContext | null> {
  const welder = await db.query.welderCertifications.findFirst({
    where: eq(welderCertifications.id, welderId),
  });
  if (!welder) return null;

  const group = await db.query.certificationGroups.findFirst({
    where: eq(certificationGroups.id, welder.groupId),
  });
  if (!group) return null;

  const [company, head, sampleMaterial, consumable1, consumable2] = await Promise.all([
    db.query.companies.findFirst({ where: eq(companies.id, welder.companyId) }),
    db.query.commissionMembers.findFirst({ where: eq(commissionMembers.id, group.headId) }),
    db.query.sampleMaterials.findFirst({ where: eq(sampleMaterials.id, welder.sampleMaterialId) }),
    db.query.weldingConsumables.findFirst({ where: eq(weldingConsumables.id, welder.consumable1Id) }),
    welder.consumable2Id
      ? db.query.weldingConsumables.findFirst({ where: eq(weldingConsumables.id, welder.consumable2Id) })
      : Promise.resolve(null),
  ]);

  if (!company || !head || !sampleMaterial || !consumable1) return null;

  const links = await db
    .select()
    .from(welderCertificationRegulatoryDocuments)
    .where(eq(welderCertificationRegulatoryDocuments.welderCertificationId, welderId));

  const docIds = links.map((l) => l.regulatoryDocumentId);
  const regulatoryDocsRows =
    docIds.length > 0
      ? await db.select().from(regulatoryDocuments).where(inArray(regulatoryDocuments.id, docIds))
      : [];

  return {
    welder,
    group,
    company,
    head,
    sampleMaterial,
    consumable1,
    consumable2: consumable2 ?? null,
    regulatoryDocs: regulatoryDocsRows,
  };
}

export async function loadGroupCommissionMembersForDocx(groupId: string): Promise<{
  displayLines: string[];
  namesOnly: string[];
}> {
  const rows = await db
    .select({ fullName: commissionMembers.fullName, position: commissionMembers.position })
    .from(certificationGroupMembers)
    .innerJoin(commissionMembers, eq(certificationGroupMembers.memberId, commissionMembers.id))
    .where(eq(certificationGroupMembers.groupId, groupId));

  return {
    displayLines: rows.map((r) => formatCommissionMemberDocxLine(r.fullName, r.position)),
    namesOnly: rows.map((r) => r.fullName.trim()).filter(Boolean),
  };
}

export async function loadGroupCommissionMemberNames(groupId: string): Promise<string[]> {
  const { displayLines } = await loadGroupCommissionMembersForDocx(groupId);
  return displayLines;
}
