/**
 * Ukrainian UAH amount in words for contract totals (гривні + копійки).
 */

const ONES_F = ["", "одна", "дві", "три", "чотири", "п'ять", "шість", "сім", "вісім", "дев'ять"];
const ONES_M = ["", "один", "два", "три", "чотири", "п'ять", "шість", "сім", "вісім", "дев'ять"];

const TEENS = [
  "десять",
  "одинадцять",
  "дванадцять",
  "тринадцять",
  "чотирнадцять",
  "п'ятнадцять",
  "шістнадцять",
  "сімнадцять",
  "вісімнадцять",
  "дев'ятнадцять",
];

const TENS = [
  "",
  "",
  "двадцять",
  "тридцять",
  "сорок",
  "п'ятдесят",
  "шістдесят",
  "сімдесят",
  "вісімдесят",
  "дев'яносто",
];

const HUNDREDS = [
  "",
  "сто",
  "двісті",
  "триста",
  "чотириста",
  "п'ятсот",
  "шістсот",
  "сімсот",
  "вісімсот",
  "дев'ятсот",
];

type Gender = "f" | "m";

function onesWord(n: number, g: Gender) {
  return g === "f" ? ONES_F[n] : ONES_M[n];
}

/** 1..999 with gender for last digit (and teens block uses same gender). */
function tripleToWords(n: number, g: Gender): string {
  if (n < 0 || n > 999) throw new Error("triple out of range");
  if (n === 0) return "";

  const h = Math.floor(n / 100);
  const t = n % 100;
  const parts: string[] = [];
  if (h > 0) parts.push(HUNDREDS[h] ?? "");

  if (t >= 10 && t < 20) {
    parts.push(TEENS[t - 10]);
  } else {
    const ten = Math.floor(t / 10);
    const one = t % 10;
    if (ten >= 2) parts.push(TENS[ten]);
    if (one > 0) parts.push(onesWord(one, g));
  }

  return parts.filter(Boolean).join(" ");
}

function thousandsForm(n: number): string {
  const m10 = n % 10;
  const m100 = n % 100;
  if (m100 >= 11 && m100 <= 14) return "тисяч";
  if (m10 === 1) return "тисяча";
  if (m10 >= 2 && m10 <= 4) return "тисячі";
  return "тисяч";
}

function millionsForm(n: number): string {
  const m10 = n % 10;
  const m100 = n % 100;
  if (m100 >= 11 && m100 <= 14) return "мільйонів";
  if (m10 === 1) return "мільйон";
  if (m10 >= 2 && m10 <= 4) return "мільйони";
  return "мільйонів";
}

function billionsForm(n: number): string {
  const m10 = n % 10;
  const m100 = n % 100;
  if (m100 >= 11 && m100 <= 14) return "мільярдів";
  if (m10 === 1) return "мільярд";
  if (m10 >= 2 && m10 <= 4) return "мільярди";
  return "мільярдів";
}

/** Thousands group uses feminine small numbers (одна/дві тисячі). */
function thousandsTripleToWords(n: number): string {
  if (n < 0 || n > 999) throw new Error("triple out of range");
  if (n === 0) return "";

  const h = Math.floor(n / 100);
  const t = n % 100;
  const parts: string[] = [];
  if (h > 0) parts.push(HUNDREDS[h] ?? "");

  if (t >= 10 && t < 20) {
    const teenFem = [
      "десять",
      "одинадцять",
      "дванадцять",
      "тринадцять",
      "чотирнадцять",
      "п'ятнадцять",
      "шістнадцять",
      "сімнадцять",
      "вісімнадцять",
      "дев'ятнадцять",
    ];
    parts.push(teenFem[t - 10]);
  } else {
    const ten = Math.floor(t / 10);
    const one = t % 10;
    if (ten >= 2) parts.push(TENS[ten]);
    if (one > 0) parts.push(onesWord(one, "f"));
  }

  return parts.filter(Boolean).join(" ");
}

function joinParts(parts: string[]): string {
  return parts.filter((p) => p && p.trim().length > 0).join(" ");
}

/**
 * @param unitsGender Gender for the 1..999 "units" group (before гривня use "f").
 */
function integerToUkrainianWords(n: number, unitsGender: Gender = "m"): string {
  if (!Number.isFinite(n) || n < 0 || n > 999999999999) {
    return String(n);
  }
  if (n === 0) return "нуль";

  const billions = Math.floor(n / 1_000_000_000);
  const millions = Math.floor((n % 1_000_000_000) / 1_000_000);
  const thousands = Math.floor((n % 1_000_000) / 1000);
  const units = n % 1000;

  const out: string[] = [];

  if (billions > 0) {
    out.push(tripleToWords(billions, "m"));
    out.push(billionsForm(billions));
  }
  if (millions > 0) {
    out.push(tripleToWords(millions, "m"));
    out.push(millionsForm(millions));
  }
  if (thousands > 0) {
    out.push(thousandsTripleToWords(thousands));
    out.push(thousandsForm(thousands));
  }
  if (units > 0) {
    out.push(tripleToWords(units, unitsGender));
  }

  return joinParts(out);
}

function hryvniaWordForm(n: number): string {
  const m10 = n % 10;
  const m100 = n % 100;
  if (m100 >= 11 && m100 <= 14) return "гривень";
  if (m10 === 1) return "гривня";
  if (m10 >= 2 && m10 <= 4) return "гривні";
  return "гривень";
}

function kopiykaWordForm(n: number): string {
  const m10 = n % 10;
  const m100 = n % 100;
  if (m100 >= 11 && m100 <= 14) return "копійок";
  if (m10 === 1) return "копійка";
  if (m10 >= 2 && m10 <= 4) return "копійки";
  return "копійок";
}

/**
 * Amount in words only (no leading figure), sentence case.
 * Example: `Чотири тисячі сто шість гривень 57 копійок`
 */
function uahAmountWordsOnly(amount: number): string {
  const rounded = Math.round((amount + Number.EPSILON) * 100) / 100;
  const hrn = Math.floor(rounded + 1e-9);
  let kop = Math.round((rounded - hrn) * 100);
  if (kop === 100) {
    kop = 0;
  }

  const hrnWords = hrn === 0 ? "нуль" : integerToUkrainianWords(hrn, "f");
  const kopStr = kop.toString().padStart(2, "0");
  const inWords = `${hrnWords} ${hryvniaWordForm(hrn)} ${kopStr} ${kopiykaWordForm(kop)}`;
  return inWords.charAt(0).toLocaleUpperCase("uk") + inWords.slice(1);
}

/**
 * Amount for contract text: figure + parenthetical words for hryvnias, kopiyky as digits.
 * Example: `4106.57 (Чотири тисячі сто шість гривень 57 копійок)`
 */
function uahAmountToWords(amount: number): string {
  const rounded = Math.round((amount + Number.EPSILON) * 100) / 100;
  return `${rounded.toFixed(2)} (${uahAmountWordsOnly(amount)})`;
}

/**
 * Total with VAT + VAT amount in the same style, for contract “загальна вартість … в т. ч. ПДВ …”.
 */
export function uahContractPriceLiteral(totalWithVat: number, vatAmount: number): string {
  return `${uahAmountToWords(totalWithVat)} в т. ч. ПДВ ${uahAmountToWords(vatAmount)}`;
}

/**
 * Invoice “сума прописом”: words only, без цифр у дужках.
 * Приклад: `Чотирнадцять тисяч … 40 копійок в т. ч. ПДВ Дві тисячі … 40 копійок`
 */
export function uahInvoicePriceLiteral(totalWithVat: number, vatAmount: number): string {
  return `${uahAmountWordsOnly(totalWithVat)} в т. ч. ПДВ ${uahAmountWordsOnly(vatAmount)}`;
}
