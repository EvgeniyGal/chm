import { z } from "zod";

function normalizePhone(input: string) {
  const digits = input.replace(/\D/g, "");
  if (digits.startsWith("380")) return `+${digits}`;
  if (digits.startsWith("0") && digits.length === 10) return `+38${digits}`;
  if (digits.length === 9) return `+380${digits}`;
  return input.trim();
}

const contactSchema = z
  .array(
    z.object({
      type: z.enum(["tel", "email"]),
      value: z.string().min(1),
    }),
  )
  .default([]);

/** Normalizes and validates contacts; returns JSON string for DB (same rules as new company server action). */
export function parseContactsJsonForDb(contactsJson: string): string {
  try {
    const raw = JSON.parse(contactsJson);
    const validated = contactSchema.parse(raw)
      .map((item) => {
        const value = item.type === "tel" ? normalizePhone(item.value) : item.value.trim().toLowerCase();
        return { type: item.type, value };
      })
      .filter((item) => {
        if (item.type === "email") {
          return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(item.value);
        }
        return /^\+380\d{9}$/.test(item.value);
      });
    return JSON.stringify(validated);
  } catch {
    return "[]";
  }
}
