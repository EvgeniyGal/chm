type Part = "plate" | "pipe";
type Joint = "BW" | "FW";
type Jc = "bs_gg" | "bs_ng" | "ss_mb" | "ss_nb";

function weldedPartsTypeLetter(t: Part): "P" | "T" {
  return t === "pipe" ? "T" : "P";
}

export function formatJointCharacteristicsForCode(v: Jc): string {
  return v.replace(/_/g, " ");
}

/**
 * TRD §4.8 / §7.7.1 — single-line certification code (simplified; combined uses backslash). Вид деталей: `P` / `T`.
 */
export function buildCertificationCodeString(input: {
  weldingMethod1: string;
  weldingMethod2: string | null;
  isCombined: boolean;
  weldedPartsType: Part;
  jointType: Joint;
  sampleMaterialGroupCode: string;
  consumableCoating1: string;
  consumableCoating2: string | null;
  thickness1: string | null;
  thickness2: string | null;
  thickness3: string | null;
  pipeDiameter1: string | null;
  pipeDiameter2: string | null;
  pipeDiameter3: string | null;
  weldingPosition1: string;
  weldingPosition2: string | null;
  jointCharacteristics: Jc;
}): string {
  const wm = input.isCombined
    ? `${input.weldingMethod1}\\${input.weldingMethod2 ?? ""}`
    : input.weldingMethod1;
  const part = weldedPartsTypeLetter(input.weldedPartsType);
  const jt = input.jointType;
  const grp = input.sampleMaterialGroupCode;
  const coat = input.isCombined
    ? `${input.consumableCoating1}\\${input.consumableCoating2 ?? ""}`
    : input.consumableCoating1;

  const tParts = [input.thickness1, input.thickness2, input.thickness3]
    .filter(Boolean)
    .map((t) => `t${t}`);
  const dParts = [input.pipeDiameter1, input.pipeDiameter2, input.pipeDiameter3]
    .filter(Boolean)
    .map((d) => `D${d}`);
  const dim = [...tParts, ...dParts].join(" ");

  const pos = input.weldingPosition2
    ? `${input.weldingPosition1} ${input.weldingPosition2}`
    : input.weldingPosition1;
  const jc = formatJointCharacteristicsForCode(input.jointCharacteristics);

  return [wm, part, jt, grp, coat, dim, pos, jc].filter((s) => s.length > 0).join(" ");
}
