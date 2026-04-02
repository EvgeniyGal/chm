import { z } from "zod";

export const certificationGroupCreateSchema = z.object({
  groupNumber: z.string().min(1, "Вкажіть номер групи"),
  protocolDate: z.string().min(1),
  inspectionDate: z.string().min(1),
  certificateIssueDate: z.string().min(1),
  certificateIssueLocation: z.string().min(1, "Вкажіть місце видачі"),
  headId: z.string().uuid("Оберіть голову комісії"),
  memberIds: z.array(z.string().uuid()).max(5, "Не більше 5 членів комісії"),
});

export const certificationGroupUpdateSchema = certificationGroupCreateSchema;

export const welderCertificationCreateSchema = z
  .object({
    groupId: z.string().uuid("Оберіть групу"),
    lastName: z.string().min(1).max(100),
    firstName: z.string().min(1).max(100),
    middleName: z.string().max(100).optional(),
    birthLocation: z.string().max(255).optional(),
    birthday: z.string().optional(),
    prevQualificationDoc: z.string().max(255).optional(),
    workExperienceYears: z.string().min(1),
    companyId: z.string().uuid("Оберіть компанію"),
    certificationType: z.enum(["primary", "additional", "periodic", "extraordinary"]),
    isCombined: z.boolean(),
    weldingMethod1: z.string().min(1).max(20),
    weldingMethod2: z.string().max(20).optional(),
    weldedPartsType: z.enum(["plate", "pipe"]),
    jointType: z.enum(["BW", "FW"]),
    jointCharacteristics: z.enum(["bs_gg", "bs_ng", "ss_mb", "ss_nb"]),
    weldingPosition1: z.string().min(1).max(10),
    weldingPosition2: z.string().max(10).optional(),
    preheat: z.boolean(),
    heatTreatment: z.boolean(),
    sampleMaterialId: z.string().uuid(),
    thickness1: z.string().optional(),
    thickness2: z.string().optional(),
    thickness3: z.string().optional(),
    pipeDiameter1: z.string().optional(),
    pipeDiameter2: z.string().optional(),
    pipeDiameter3: z.string().optional(),
    consumable1Id: z.string().uuid(),
    consumable2Id: z.string().uuid().optional(),
    shieldingGasFlux: z.string().max(255).optional(),
    sampleMark: z.string().min(1).max(50),
    inspVisual: z.boolean(),
    inspRadiographic: z.boolean(),
    inspUltrasonic: z.boolean(),
    inspBend: z.boolean(),
    inspMetallographic: z.boolean(),
    inspAdditional: z.boolean(),
    theoryScore: z.enum(["passed", "failed"]),
    regulatoryDocumentIds: z.array(z.string().uuid()).min(1, "Оберіть хоча б один нормативний документ").max(10, "Не більше 10 НД"),
  })
  .superRefine((data, ctx) => {
    if (data.isCombined) {
      if (!data.weldingMethod2?.trim()) {
        ctx.addIssue({ code: "custom", message: "Для комбінованого зварювання вкажіть другий спосіб", path: ["weldingMethod2"] });
      }
      if (!data.consumable2Id) {
        ctx.addIssue({ code: "custom", message: "Для комбінованого зварювання вкажіть другий матеріал", path: ["consumable2Id"] });
      }
    }
    if (data.weldedPartsType === "pipe" && !data.pipeDiameter1?.trim()) {
      ctx.addIssue({ code: "custom", message: "Вкажіть діаметр труби", path: ["pipeDiameter1"] });
    }
    if (!data.thickness1?.trim()) {
      ctx.addIssue({ code: "custom", message: "Вкажіть товщину зразка", path: ["thickness1"] });
    }
  });
