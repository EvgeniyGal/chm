"use client";

import { formatMoney } from "@/lib/totals";

type AcceptanceActReadonlyLineItem = {
  id: string;
  title: string;
  unit: string;
  quantity: string;
  price: string;
};

/** Read-only line list: desktop table + mobile cards (aligned with `LineItemsTable`). */
export function AcceptanceActReadonlyLineItems({ items }: { items: AcceptanceActReadonlyLineItem[] }) {
  return (
    <div className="min-w-0 max-w-full rounded-xl border bg-white">
      <div className="hidden min-w-0 max-w-full overflow-x-hidden md:block">
        <table className="w-full max-w-full table-fixed border-collapse text-sm">
          <colgroup>
            <col className="w-[40px]" />
            <col />
            <col className="w-[100px]" />
            <col className="w-[80px]" />
            <col className="w-[120px]" />
            <col className="w-[120px]" />
          </colgroup>
          <thead className="bg-crm-table-header text-left text-sm font-semibold text-foreground/90">
            <tr>
              <th className="w-[40px] max-w-[40px] px-2 py-2 text-center">#</th>
              <th className="min-w-0 px-3 py-2">Назва</th>
              <th className="w-[100px] max-w-[100px] px-3 py-2">Од. вим.</th>
              <th className="w-[80px] max-w-[80px] px-3 py-2">К-сть</th>
              <th className="w-[120px] max-w-[120px] px-3 py-2">Ціна без ПДВ</th>
              <th className="w-[120px] max-w-[120px] px-3 py-2 text-center">Сума без ПДВ</th>
            </tr>
          </thead>
          <tbody>
            {items.map((it, idx) => {
              const q = Number(it.quantity);
              const p = Number(it.price);
              const row = Number.isFinite(q) && Number.isFinite(p) ? q * p : 0;
              return (
                <tr key={it.id} className="border-t align-middle">
                  <td className="px-2 py-2 text-center text-muted-foreground">{idx + 1}</td>
                  <td className="min-w-0 px-3 py-2">
                    <div className="whitespace-pre-wrap break-words">{it.title}</div>
                  </td>
                  <td className="px-3 py-2">{it.unit}</td>
                  <td className="px-3 py-2 tabular-nums">{formatMoney(q)}</td>
                  <td className="px-3 py-2 tabular-nums">{formatMoney(p)}</td>
                  <td className="px-3 py-2 text-center tabular-nums">{formatMoney(row)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="flex flex-col gap-3 p-3 md:hidden">
        {items.map((it, idx) => {
          const q = Number(it.quantity);
          const p = Number(it.price);
          const row = Number.isFinite(q) && Number.isFinite(p) ? q * p : 0;
          return (
            <div key={it.id} className="rounded-xl border bg-white p-3">
              <div className="mb-2 text-sm font-semibold text-foreground">Рядок #{idx + 1}</div>
              <div className="grid grid-cols-1 gap-2">
                <div className="flex flex-col gap-1 text-sm">
                  <span className="text-zinc-700">Назва</span>
                  <div className="whitespace-pre-wrap break-words text-foreground">{it.title}</div>
                </div>
                <div className="flex flex-col gap-1 text-sm">
                  <span className="text-zinc-700">Од. вим.</span>
                  <div className="text-foreground">{it.unit}</div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex flex-col gap-1 text-sm">
                    <span className="text-zinc-700">К-сть</span>
                    <div className="tabular-nums text-foreground">{formatMoney(q)}</div>
                  </div>
                  <div className="flex flex-col gap-1 text-sm">
                    <span className="text-zinc-700">Ціна без ПДВ</span>
                    <div className="tabular-nums text-foreground">{formatMoney(p)}</div>
                  </div>
                </div>
                <div className="flex justify-end text-sm tabular-nums text-foreground">{formatMoney(row)}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
