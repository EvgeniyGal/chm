import { z } from "zod";

/** Довжина префікса з трьох полів: послідовно заповнені з першого (без «дірки»). */
function prefixLen3(vals: (string | undefined)[]): number {
  let k = 0;
  for (let i = 0; i < 3; i++) {
    if (vals[i]?.trim()) k++;
    else break;
  }
  return k;
}

function isValidMmDecimal(s: string | undefined): boolean {
  const t = s?.trim();
  if (!t) return true;
  const n = t.replace(",", ".").replace(/\.$/, "");
  return /^\d+(\.\d{1,2})?$/.test(n);
}

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
    lastName: z.string().trim().min(1, "Вкажіть прізвище").max(100),
    firstName: z.string().trim().min(1, "Вкажіть ім'я").max(100),
    middleName: z.string().trim().min(1, "Вкажіть по батькові").max(100),
    birthLocation: z.string().trim().min(1, "Вкажіть місце народження").max(255),
    birthday: z
      .string()
      .trim()
      .min(1, "Вкажіть дату народження")
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Некоректна дата народження"),
    prevQualificationDoc: z
      .string()
      .trim()
      .min(1, "Вкажіть дані про попереднє посвідчення")
      .max(255),
    workExperienceYears: z
      .string()
      .transform((s) => s.trim())
      .pipe(
        z
          .string()
          .min(1, "Вкажіть стаж зварника")
          .regex(/^\d+$/, "Стаж має бути цілим числом років (0–999)")
          .refine((s) => {
            const n = Number.parseInt(s, 10);
            return n >= 0 && n <= 999;
          }, "Стаж має бути від 0 до 999 років")
          .transform((s) => String(Number.parseInt(s, 10))),
      ),
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
    manualJointCharacteristicsAdmission: z.string().max(4000),
    manualWeldingPositionAdmission: z.string().max(4000),
    manualThicknessAdmission: z.string().max(4000),
    manualDiameterAdmission: z.string().max(4000),
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
    if (!data.thickness1?.trim()) {
      ctx.addIssue({ code: "custom", message: "Вкажіть товщину зразка", path: ["thickness1"] });
    }
    if (!data.manualJointCharacteristicsAdmission?.trim()) {
      ctx.addIssue({
        code: "custom",
        message: "Вкажіть текст допуску за характеристикою шва",
        path: ["manualJointCharacteristicsAdmission"],
      });
    }
    if (!data.manualWeldingPositionAdmission?.trim()) {
      ctx.addIssue({
        code: "custom",
        message: "Вкажіть текст допуску за положенням зварювання",
        path: ["manualWeldingPositionAdmission"],
      });
    }
    if (!data.manualThicknessAdmission?.trim()) {
      ctx.addIssue({
        code: "custom",
        message: "Вкажіть текст допуску за товщиною",
        path: ["manualThicknessAdmission"],
      });
    }
    if (data.weldedPartsType === "pipe" && !data.manualDiameterAdmission?.trim()) {
      ctx.addIssue({
        code: "custom",
        message: "Вкажіть текст допуску за діаметром труби",
        path: ["manualDiameterAdmission"],
      });
    }

    const tFields: [string, string | undefined][] = [
      ["thickness1", data.thickness1],
      ["thickness2", data.thickness2],
      ["thickness3", data.thickness3],
    ];
    for (const [key, val] of tFields) {
      if (!isValidMmDecimal(val)) {
        ctx.addIssue({
          code: "custom",
          message: "Вкажіть число в мм (до двох знаків після коми).",
          path: [key],
        });
      }
    }

    if (data.weldedPartsType === "pipe") {
      const pFields: [string, string | undefined][] = [
        ["pipeDiameter1", data.pipeDiameter1],
        ["pipeDiameter2", data.pipeDiameter2],
        ["pipeDiameter3", data.pipeDiameter3],
      ];
      for (const [key, val] of pFields) {
        if (!isValidMmDecimal(val)) {
          ctx.addIssue({
            code: "custom",
            message: "Вкажіть число в мм (до двох знаків після коми).",
            path: [key],
          });
        }
      }

      const tn = prefixLen3([data.thickness1, data.thickness2, data.thickness3]);
      const pn = prefixLen3([data.pipeDiameter1, data.pipeDiameter2, data.pipeDiameter3]);
      if (tn !== pn) {
        ctx.addIssue({
          code: "custom",
          message:
            "Для труби кількість зазначених товщин має збігатися з кількістю зазначених діаметрів (послідовно: 1 з 1, 2 з 2, 3 з 3).",
          path: ["pipeDiameter1"],
        });
      }
    }
  });
