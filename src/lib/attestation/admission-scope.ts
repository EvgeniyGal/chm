/**
 * Область поширення атестації за п.3.2.5, 6.3–6.5 «Welder_Certification_Rules.md»
 * (табл. 2 — товщина, табл. 3 — діаметр, табл. 6 — групи металу, табл. 8 — покриття електродів).
 */

import { sampleMaterialGroupCodes, weldedPartsTypes } from "@/db/schema/attestation";

type GroupCode = (typeof sampleMaterialGroupCodes)[number];
type WeldedParts = (typeof weldedPartsTypes)[number];

const GAS_WELD_CODE = "311";

function parseMm(v: string | null | undefined): number | null {
  if (v == null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function formatMm(n: number): string {
  if (Number.isInteger(n)) return String(n);
  return n.toLocaleString("uk-UA", { maximumFractionDigits: 2 });
}

/** Компактні числа для умов t, D (мм), без пробілів. */
export function formatNumShort(n: number): string {
  if (Number.isInteger(n)) return String(n);
  const s = n.toFixed(2).replace(/\.?0+$/, "");
  return s;
}

function isGasWelding(method: string): boolean {
  return method.trim() === GAS_WELD_CODE;
}

/** Таблиця 2 — інтервал товщин (мм) для зразка товщиною t. Якщо t > 12 — окремий режим (нижня межа допуску ≥5 мм). */
function thicknessIntervalMm(
  t: number,
  gas: boolean,
): { lo: number; hi: number } | { kind: "thick" } {
  if (t > 12) return { kind: "thick" };
  if (t <= 3) {
    const hi = gas ? 1.5 * t : 2 * t;
    return { lo: t, hi };
  }
  const hi = gas ? 1.5 * t : 2 * t;
  return { lo: 3, hi };
}

/** Об'єднання скінченних інтервалів [lo, hi] (для кількох методів при однаковій t). */
function unionIntervals(intervals: Array<{ lo: number; hi: number }>): { lo: number; hi: number } | null {
  if (intervals.length === 0) return null;
  let lo = intervals[0].lo;
  let hi = intervals[0].hi;
  for (let i = 1; i < intervals.length; i++) {
    lo = Math.min(lo, intervals[i].lo);
    hi = Math.max(hi, intervals[i].hi);
  }
  return { lo, hi };
}

/**
 * Нижня межа — з зразка з мінімальною t, верхня — з зразка з максимальною t.
 * Якщо кілька зразків з однаковою t (різні методи) — інтервали для цієї t об'єднуються.
 */
function thicknessBoundsMinMax(pairs: ThicknessWithMethod[]): {
  lo: number;
  hi: number | null;
  hasThickMin: boolean;
  hasThickMax: boolean;
} | null {
  if (pairs.length === 0) return null;

  let tMin = pairs[0].tMm;
  let tMax = pairs[0].tMm;
  for (const p of pairs) {
    if (p.tMm < tMin) tMin = p.tMm;
    if (p.tMm > tMax) tMax = p.tMm;
  }

  if (tMin === tMax) {
    const intervals: Array<{ lo: number; hi: number }> = [];
    let hasThick = false;
    for (const p of pairs) {
      const r = thicknessIntervalMm(p.tMm, isGasWelding(p.methodCode));
      if ("kind" in r) {
        hasThick = true;
        continue;
      }
      intervals.push(r);
    }
    const u = unionIntervals(intervals);
    if (hasThick && !u) {
      return { lo: 5, hi: null, hasThickMin: true, hasThickMax: true };
    }
    if (u) {
      return { lo: u.lo, hi: u.hi, hasThickMin: false, hasThickMax: false };
    }
    return { lo: 5, hi: null, hasThickMin: true, hasThickMax: true };
  }

  const atMin = pairs.find((p) => p.tMm === tMin)!;
  const atMax = pairs.find((p) => p.tMm === tMax)!;

  const rLo = thicknessIntervalMm(atMin.tMm, isGasWelding(atMin.methodCode));
  const rHi = thicknessIntervalMm(atMax.tMm, isGasWelding(atMax.methodCode));

  const hasThickMin = "kind" in rLo;
  const hasThickMax = "kind" in rHi;

  let lo: number;
  if (hasThickMin) {
    lo = 5;
  } else {
    lo = rLo.lo;
  }

  let hi: number | null;
  if (hasThickMax) {
    hi = null;
  } else {
    hi = rHi.hi;
  }

  return { lo, hi, hasThickMin, hasThickMax };
}

/** Таблиця 3 — діаметр D (мм): кінці інтервалу допуску для одного зразка. */
function diameterIntervalMm(D: number): { lo: number; hi: number | null } {
  if (D <= 25) return { lo: D, hi: 2 * D };
  if (D <= 150) {
    const lo = Math.max(0.5 * D, 25);
    return { lo, hi: 2 * D };
  }
  return { lo: 0.5 * D, hi: null };
}

export type DiameterWithMethod = { dMm: number; methodCode: string };

/** Нижня межа з мінімального D зразка, верхня — з максимального D (порядок зразків 1→2→3). */
export function diameterBoundsMinMax(dPairs: DiameterWithMethod[]): { lo: number; hi: number | null } | null {
  if (dPairs.length === 0) return null;

  let dMin = dPairs[0].dMm;
  let dMax = dPairs[0].dMm;
  for (const p of dPairs) {
    if (p.dMm < dMin) dMin = p.dMm;
    if (p.dMm > dMax) dMax = p.dMm;
  }

  const atMin = dPairs.find((p) => p.dMm === dMin)!;
  const atMax = dPairs.find((p) => p.dMm === dMax)!;

  const iLo = diameterIntervalMm(atMin.dMm);
  const iHi = diameterIntervalMm(atMax.dMm);

  if (iHi.hi == null) {
    return { lo: Math.max(iLo.lo, iHi.lo), hi: null };
  }
  return { lo: iLo.lo, hi: iHi.hi };
}

export type ThicknessWithMethod = { tMm: number; methodCode: string };

function formatThicknessUaFromBounds(
  bounds: NonNullable<ReturnType<typeof thicknessBoundsMinMax>>,
): string {
  const { lo, hi, hasThickMin, hasThickMax } = bounds;
  if (hasThickMin && hasThickMax) {
    return "товщина виробу: не менше 5 мм (табл. 2, п.3.2.5)";
  }
  if (hi != null) {
    return `товщина виробу: від ${formatMm(lo)} мм до ${formatMm(hi)} мм`;
  }
  if (hasThickMax) {
    if (lo < 5) return "товщина виробу: не менше 5 мм (табл. 2, п.3.2.5)";
    return `товщина виробу: від ${formatMm(lo)} мм (табл. 2, п.3.2.5)`;
  }
  return `товщина виробу: від ${formatMm(lo)} мм`;
}

function formatThicknessShortFromBounds(
  bounds: NonNullable<ReturnType<typeof thicknessBoundsMinMax>>,
): string {
  const { lo, hi, hasThickMin, hasThickMax } = bounds;
  if (hasThickMin && hasThickMax) return "t≥5";
  if (hi != null) return `${formatNumShort(lo)}≤t≤${formatNumShort(hi)}`;
  if (hasThickMax) {
    if (lo < 5) return "t≥5";
    return `${formatNumShort(lo)}≤t`;
  }
  return `${formatNumShort(lo)}≤t`;
}

/**
 * Текст області поширення за товщиною (табл. 2).
 * Нижня межа з мінімальної t зразків, верхня — з максимальної; при однаковій t — об'єднання за методами.
 */
export function formatThicknessAdmissionUaFromPairs(pairs: ThicknessWithMethod[]): string {
  const b = thicknessBoundsMinMax(pairs);
  if (!b) return "—";
  return formatThicknessUaFromBounds(b);
}

/**
 * Короткий запис області поширення за товщиною (табл. 2), напр.: `3≤t≤20`, `t≥5`.
 */
export function formatThicknessAdmissionShortFromPairs(pairs: ThicknessWithMethod[]): string {
  const b = thicknessBoundsMinMax(pairs);
  if (!b) return "—";
  return formatThicknessShortFromBounds(b);
}

/** п — пластина, T — труба (п.7.7.5, позначення зразка). */
export function formatWeldedPartsAdmissionLetter(type: WeldedParts): "p" | "T" {
  return type === "plate" ? "p" : "T";
}

/**
 * Короткий запис області поширення за D (табл. 3): нижня межа з мінімального D зразка, верхня — з максимального.
 */
export function formatPipeDiameterAdmissionShortFromBounds(
  bounds: { lo: number; hi: number | null } | null,
): string {
  if (!bounds) return "—";
  if (bounds.hi != null) {
    return `${formatNumShort(bounds.lo)}<D≤${formatNumShort(bounds.hi)}`;
  }
  return `D≥${formatNumShort(bounds.lo)}`;
}

/** Один діаметр зразка (зворотна сумісність). */
export function formatPipeDiameterAdmissionShort(dMm: number): string {
  return formatPipeDiameterAdmissionShortFromBounds(
    diameterBoundsMinMax([{ dMm, methodCode: "111" }]),
  );
}

/**
 * Для пластини: поширення на труби (п.6.2.2, п.6.2.3) — коротко `D>500` або `D>150` (PA/PC).
 */
export function formatPlateTubeSpreadShort(
  weldingPosition1: string,
  weldingPosition2: string | null | undefined,
): string {
  const pos = `${weldingPosition1} ${weldingPosition2 ?? ""}`;
  if (/\bPA\b/.test(pos) || /\bPC\b/.test(pos)) return "D>150";
  return "D>500";
}

/** Спрощений варіант: один і той самий ISO-код (або 311 для усіх, якщо серед методів є газове зварювання) для кожного t. */
export function formatThicknessAdmissionUa(thicknessMm: number[], weldingMethods: string[]): string {
  const anyGas = weldingMethods.some(isGasWelding);
  const code = anyGas ? GAS_WELD_CODE : (weldingMethods[0] ?? "111");
  const pairs = thicknessMm.map((t) => ({ tMm: t, methodCode: code }));
  return formatThicknessAdmissionUaFromPairs(pairs);
}

/** Таблиця 3 — діаметр труби D (мм). */
export function formatPipeDiameterAdmissionUa(dMm: number): string {
  if (dMm <= 25) {
    return `зовнішній діаметр труб: від D ${formatMm(dMm)} мм до ${formatMm(2 * dMm)} мм`;
  }
  if (dMm <= 150) {
    const lo = Math.max(0.5 * dMm, 25);
    return `зовнішній діаметр труб: від ${formatMm(lo)} мм до ${formatMm(2 * dMm)} мм`;
  }
  return `зовнішній діаметр труб: D ≥ ${formatMm(0.5 * dMm)} мм (труби D > 500 мм прирівнюються до пластин, п.3.2.5)`;
}

/** Таблиця 6 — групи основного металу. */
const MATERIAL_SCOPE: Record<GroupCode, string> = {
  W01: "W 01",
  W02: "W 01, W 02",
  W03: "W 01, W 02, W 03",
  W04: "W 01, W 02, W 04",
  W11: "W 01, W 02, W 03, W 04, W 11 (за умови присадних матеріалів групи W 11, табл. 6)",
};

export function formatMaterialGroupAdmissionUa(group: GroupCode): string {
  return `групи зварюваних матеріалів (основний метал): ${MATERIAL_SCOPE[group]}`;
}

/** Таблиця 8 — область поширення за типом покриття електрода. */
const COATING_ALLOWED: Record<string, string[]> = {
  A: ["A", "RA"],
  RA: ["A", "RA"],
  R: ["A", "RA", "R", "RB", "RC"],
  RB: ["A", "RA", "R", "RB", "RC"],
  RC: ["A", "RA", "R", "RB", "RC"],
  B: ["A", "RA", "R", "RB", "RC", "B"],
  C: ["C"],
  S: ["S"],
};

export function formatCoatingAdmissionUa(coatings: string[]): string {
  const uniq = [...new Set(coatings.map((c) => c.trim()).filter(Boolean))];
  if (uniq.length === 0) return "—";
  const allowedSets = uniq.map((c) => COATING_ALLOWED[c] ?? [c]);
  let inter = new Set(allowedSets[0]);
  for (let i = 1; i < allowedSets.length; i++) {
    const next = new Set(allowedSets[i]);
    inter = new Set([...inter].filter((x) => next.has(x)));
  }
  const list = [...inter].sort().join(", ");
  return `типи покриття електродів (п.3.2.4, табл. 8): ${list}`;
}

/** п.6.2.6 — стиковий шов поширюється на кутовий за подібних умов. */
export function formatJointTypeAdmissionUa(joint: "BW" | "FW"): string {
  if (joint === "BW") {
    return "тип шва: BW; атестація на стикові шви поширюється на кутові (FW) за подібних умов (п.6.2.6)";
  }
  return "тип шва: FW";
}

export type AdmissionScopeInput = {
  weldedPartsType: WeldedParts;
  jointType: "BW" | "FW";
  sampleMaterialGroupCode: GroupCode;
  /** ISO 4063 коди (111, 141, …) — для табл. 2 примітки щодо газу 311 */
  weldingMethod1: string;
  weldingMethod2: string | null;
  isCombined: boolean;
  weldingPosition1: string;
  weldingPosition2: string | null | undefined;
  thickness1: string | null | undefined;
  thickness2: string | null | undefined;
  thickness3: string | null | undefined;
  pipeDiameter1: string | null | undefined;
  pipeDiameter2: string | null | undefined;
  pipeDiameter3: string | null | undefined;
  consumableCoating1: string;
  consumableCoating2: string | null;
};

/**
 * Повертає обчислені поля для шаблонів .docx (префікс admission-* та узагальнений текст).
 */
export function buildAdmissionScopeFields(input: AdmissionScopeInput): Record<string, string> {
  const m1 = input.weldingMethod1.trim();
  const m2 = (input.weldingMethod2 ?? "").trim();
  const pairs: ThicknessWithMethod[] = [];
  const t1 = parseMm(input.thickness1);
  if (t1 != null) pairs.push({ tMm: t1, methodCode: m1 });
  const t2 = parseMm(input.thickness2);
  if (t2 != null) {
    pairs.push({
      tMm: t2,
      methodCode: input.isCombined && m2 ? m2 : m1,
    });
  }
  const t3 = parseMm(input.thickness3);
  if (t3 != null) pairs.push({ tMm: t3, methodCode: m1 });

  const thicknessShort = formatThicknessAdmissionShortFromPairs(pairs);

  const dPairs: DiameterWithMethod[] = [];
  const d1 = parseMm(input.pipeDiameter1);
  if (d1 != null) dPairs.push({ dMm: d1, methodCode: m1 });
  const d2 = parseMm(input.pipeDiameter2);
  if (d2 != null) {
    dPairs.push({ dMm: d2, methodCode: input.isCombined && m2 ? m2 : m1 });
  }
  const d3 = parseMm(input.pipeDiameter3);
  if (d3 != null) dPairs.push({ dMm: d3, methodCode: m1 });

  let diameterShort = "—";
  if (input.weldedPartsType === "pipe" && dPairs.length > 0) {
    diameterShort = formatPipeDiameterAdmissionShortFromBounds(diameterBoundsMinMax(dPairs));
  } else if (input.weldedPartsType === "plate") {
    diameterShort = formatPlateTubeSpreadShort(input.weldingPosition1, input.weldingPosition2);
  }

  const materialUa = formatMaterialGroupAdmissionUa(input.sampleMaterialGroupCode);

  const coatingUa = formatCoatingAdmissionUa(
    [input.consumableCoating1, input.consumableCoating2].filter(Boolean) as string[],
  );

  const jointUa = formatJointTypeAdmissionUa(input.jointType);

  const partLetter = formatWeldedPartsAdmissionLetter(input.weldedPartsType);

  const narrative = [
    partLetter,
    thicknessShort !== "—" ? thicknessShort : null,
    diameterShort !== "—" ? diameterShort : null,
    materialUa,
    coatingUa,
    jointUa,
  ]
    .filter(Boolean)
    .join(" ");

  return {
    "admission-thickness-scope": thicknessShort,
    "admission-diameter-scope": diameterShort,
    "admission-welded-parts-type": partLetter,
    "admission-material-groups-scope": materialUa,
    "admission-coating-scope": coatingUa,
    "admission-joint-scope": jointUa,
    "admission-rules-summary": narrative,
  };
}
