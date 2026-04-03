/**
 * Нормалізує ASCII-запис меж для текстів допуску: ≤ / ≥ замість <=, =<, >=, =>, +>.
 */
export function normalizeAdmissionComparisonSymbols(input: string): string {
  let t = input;
  t = t.replaceAll("<=", "≤");
  t = t.replaceAll("=<", "≤");
  t = t.replaceAll(">=", "≥");
  t = t.replaceAll("=>", "≥");
  t = t.replaceAll("+>", "≥");
  return t;
}
