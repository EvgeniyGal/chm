export function AttestationMigrationMissingNotice() {
  return (
    <div className="mx-auto flex max-w-lg flex-col gap-3 rounded-md border border-border p-6">
      <h1 className="page-title">Схема атестації не застосована</h1>
      <p className="text-sm text-muted-foreground">
        У цій базі даних немає таблиць модуля атестації (міграція ще не виконана). Застосуйте міграції Drizzle до тієї ж бази, що в{" "}
        <code className="rounded bg-muted px-1">DATABASE_URL</code>:
      </p>
      <pre className="overflow-x-auto rounded-md bg-muted p-3 text-sm">npm run db:migrate</pre>
      <p className="text-xs text-muted-foreground">
        Переконайтеся, що CLI підключається до тієї ж бази, що й застосунок (наприклад <code className="rounded bg-muted px-1">.env.local</code>).
      </p>
    </div>
  );
}
