import { requireRole } from "@/lib/authz";

export default async function AuditIndexPage() {
  await requireRole("ADMIN");
  return (
    <div className="max-w-3xl">
      <h1 className="page-title">Історія змін</h1>
      <p className="mt-2 text-sm text-zinc-600">
        Відкрийте історію для конкретної сутності за посиланням виду{" "}
        <code className="rounded bg-zinc-100 px-1 py-0.5">/audit/CONTRACT/&lt;id&gt;</code>.
      </p>
    </div>
  );
}

