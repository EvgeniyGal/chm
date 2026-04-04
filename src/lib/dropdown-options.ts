import { and, eq, inArray } from "drizzle-orm";

import { db } from "@/db";
import { dropdownOptions } from "@/db/schema";
import type { DropdownScope } from "./dropdown-scopes";

export { DROPDOWN_SCOPE } from "./dropdown-scopes";

function normalizeValues(values: string[]) {
  return [...new Set(values.map((v) => v.trim()).filter(Boolean))];
}

/** Ukrainian locale alphabetical order (DB `ORDER BY` uses collation, not this). */
function sortUa(values: string[]) {
  return [...values].sort((a, b) => a.localeCompare(b, "uk"));
}

export async function getDropdownOptions(scope: DropdownScope) {
  const rows = await db
    .select({ value: dropdownOptions.value })
    .from(dropdownOptions)
    .where(eq(dropdownOptions.scope, scope));
  return sortUa(rows.map((r) => r.value));
}

export async function saveDropdownOption(scope: DropdownScope, value: string) {
  const [normalized] = normalizeValues([value]);
  if (!normalized) return;
  await db.insert(dropdownOptions).values({ scope, value: normalized }).onConflictDoNothing();
}

export async function saveDropdownOptions(scope: DropdownScope, values: string[]) {
  const normalized = normalizeValues(values);
  if (normalized.length === 0) return;

  const existingRows = await db
    .select({ value: dropdownOptions.value })
    .from(dropdownOptions)
    .where(and(eq(dropdownOptions.scope, scope), inArray(dropdownOptions.value, normalized)));

  const existing = new Set(existingRows.map((r) => r.value));
  const toInsert = normalized.filter((v) => !existing.has(v));
  if (toInsert.length === 0) return;

  await db
    .insert(dropdownOptions)
    .values(toInsert.map((value) => ({ scope, value })))
    .onConflictDoNothing();
}

export async function deleteDropdownOptions(scope: DropdownScope, values: string[]) {
  const normalized = normalizeValues(values);
  if (normalized.length === 0) return;
  await db
    .delete(dropdownOptions)
    .where(and(eq(dropdownOptions.scope, scope), inArray(dropdownOptions.value, normalized)));
}

