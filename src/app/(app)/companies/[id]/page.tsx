import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";

import { db } from "@/db";
import { companies } from "@/db/schema";
import { writeAuditEvent } from "@/lib/audit";
import { requireRole } from "@/lib/authz";

export default async function CompanyInfoPage({ params }: { params: Promise<{ id: string }> }) {
  await requireRole("MANAGER");
  const { id } = await params;

  const row = await db.query.companies.findFirst({ where: eq(companies.id, id) });
  if (!row) redirect("/companies");

  async function remove() {
    "use server";
    const { userId } = await requireRole("ADMIN");
    const before = await db.query.companies.findFirst({ where: eq(companies.id, id) });
    await db.delete(companies).where(eq(companies.id, id));
    await writeAuditEvent({
      entityType: "COMPANY",
      entityId: id,
      action: "DELETE",
      actorUserId: userId,
      diff: { before },
    });
    redirect("/companies");
  }

  return (
    <div className="flex max-w-3xl flex-col gap-4">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">{row.shortName}</h1>
          <p className="text-sm text-zinc-600">{row.fullName}</p>
        </div>
        <div className="flex gap-2">
          <a className="inline-flex h-10 items-center rounded-md border px-4 text-sm" href={`/companies/${id}/edit`}>
            Редагувати
          </a>
          <form action={remove}>
            <button
              type="submit"
              className="inline-flex h-10 items-center rounded-md border border-red-300 px-4 text-sm text-red-700 hover:bg-red-50"
            >
              Видалити
            </button>
          </form>
        </div>
      </div>

      <div className="grid gap-3 rounded-xl border bg-white p-4 text-sm">
        <Row k="ЄДРПОУ" v={row.edrpouCode} />
        <Row k="ІПН" v={row.vatIdTin ?? "—"} />
        <Row k="Статус платника податку" v={row.taxStatus} />
        <Row k="IBAN" v={row.iban} />
        <Row k="Банк" v={row.bank} />
        <Row k="Адреса" v={row.address} />
      </div>

      <a className="text-sm underline" href="/companies">
        ← Назад до списку
      </a>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="grid grid-cols-3 gap-3">
      <div className="text-zinc-500">{k}</div>
      <div className="col-span-2 text-zinc-900">{v}</div>
    </div>
  );
}

