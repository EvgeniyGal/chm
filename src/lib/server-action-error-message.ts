/** Human-readable Ukrainian messages for errors thrown from server actions / internal API. */
export function getServerActionErrorMessage(e: unknown): string {
  if (!(e instanceof Error)) return "Сталася помилка.";

  const m = e.message;
  const map: Record<string, string> = {
    CANNOT_DEMOTE_SELF_OWNER: "Не можна змінити свою роль власника.",
    CREATE_FAILED: "Не вдалося створити запис.",
    UPDATE_FAILED: "Не вдалося зберегти зміни.",
    UNAUTHORIZED: "Потрібен вхід у систему.",
    UNAPPROVED: "Акаунт ще не схвалено.",
    FORBIDDEN: "Недостатньо прав для цієї дії.",
    GENERATE_FAILED: "Не вдалося сформувати документ.",
    UPLOAD_FAILED: "Не вдалося завантажити файл.",
    VALIDATION_ERROR: "Перевірте заповнення полів (кількість і ціни — числа, обов’язкові поля заповнені).",
  };

  return map[m] ?? m;
}
