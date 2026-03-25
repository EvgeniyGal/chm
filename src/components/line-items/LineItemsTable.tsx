"use client";

import { useFieldArray, useFormContext } from "react-hook-form";

import { calcTotals, formatMoney } from "@/lib/totals";

type LineItemForm = {
  items: Array<{
    title: string;
    unit: string;
    quantity: number;
    price: number;
  }>;
};

export function LineItemsTable({ currency = "₴" }: { currency?: string }) {
  const { register, watch } = useFormContext<LineItemForm>();
  const { fields, append, remove } = useFieldArray({ name: "items" });

  const items = watch("items") ?? [];
  const totals = calcTotals(
    items.map((it) => ({
      quantity: Number(it?.quantity ?? 0),
      price: Number(it?.price ?? 0),
    })),
  );

  return (
    <div className="rounded-xl border bg-white">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-[#FFF7E5] text-left text-zinc-700">
            <tr>
              <th className="px-3 py-2 w-12">#</th>
              <th className="px-3 py-2 min-w-64">Назва</th>
              <th className="px-3 py-2 w-28">Од.</th>
              <th className="px-3 py-2 w-28">К-сть</th>
              <th className="px-3 py-2 w-32">Ціна</th>
              <th className="px-3 py-2 w-32">Сума</th>
              <th className="px-3 py-2 w-20"></th>
            </tr>
          </thead>
          <tbody>
            {fields.map((f, idx) => {
              const q = Number(items[idx]?.quantity ?? 0);
              const p = Number(items[idx]?.price ?? 0);
              const rowTotal = q * p;
              return (
                <tr key={f.id} className="border-t align-top">
                  <td className="px-3 py-2 text-zinc-500">{idx + 1}</td>
                  <td className="px-3 py-2">
                    <input
                      className="h-10 w-full rounded-md border px-3"
                      {...register(`items.${idx}.title`, { required: true })}
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      className="h-10 w-full rounded-md border px-3"
                      {...register(`items.${idx}.unit`, { required: true })}
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="number"
                      step="0.01"
                      min={0}
                      className="h-10 w-full rounded-md border px-3"
                      {...register(`items.${idx}.quantity`, { required: true, valueAsNumber: true, min: 0 })}
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="number"
                      step="0.01"
                      min={0}
                      className="h-10 w-full rounded-md border px-3"
                      {...register(`items.${idx}.price`, { required: true, valueAsNumber: true, min: 0 })}
                    />
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {formatMoney(Number.isFinite(rowTotal) ? rowTotal : 0)} {currency}
                  </td>
                  <td className="px-3 py-2">
                    <button
                      type="button"
                      className="h-10 w-full rounded-md border px-3 text-sm hover:bg-zinc-50 disabled:opacity-50"
                      onClick={() => remove(idx)}
                      disabled={fields.length <= 1}
                      title={fields.length <= 1 ? "Не можна видалити останній рядок" : "Видалити рядок"}
                    >
                      Видалити
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between gap-3 border-t p-3">
        <button
          type="button"
          className="inline-flex h-10 items-center rounded-md border px-4 text-sm hover:bg-zinc-50"
          onClick={() => append({ title: "", unit: "", quantity: 0, price: 0 })}
        >
          + Додати рядок
        </button>
        <div className="text-sm tabular-nums text-zinc-700">
          <div className="flex justify-end gap-4">
            <span>Разом (без ПДВ):</span>
            <span>
              {formatMoney(totals.totalWithoutVat)} {currency}
            </span>
          </div>
          <div className="flex justify-end gap-4">
            <span>ПДВ 20%:</span>
            <span>
              {formatMoney(totals.vat20)} {currency}
            </span>
          </div>
          <div className="flex justify-end gap-4 font-semibold">
            <span>Разом з ПДВ:</span>
            <span>
              {formatMoney(totals.totalWithVat)} {currency}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

