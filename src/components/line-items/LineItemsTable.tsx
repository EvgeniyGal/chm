"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { useFieldArray, useFormContext } from "react-hook-form";
import { flexRender, getCoreRowModel, useReactTable, type ColumnDef } from "@tanstack/react-table";
import { FiTrash2 } from "react-icons/fi";

import { calcTotals, formatMoney } from "@/lib/totals";

function formatPriceTwoDecimals(raw: string) {
  const n = Number.parseFloat(String(raw).replace(",", ".").trim());
  if (!Number.isFinite(n)) return raw;
  return n.toFixed(2);
}

type LineItemForm = {
  items: Array<{
    title: string;
    unit: string;
    quantity: number | string;
    price: number | string;
  }>;
};

export function LineItemsTable() {
  const { register, watch, setValue } = useFormContext<LineItemForm>();
  const { fields, append, remove } = useFieldArray({ name: "items" });
  const [pendingDeleteIdx, setPendingDeleteIdx] = useState<number | null>(null);
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(min-width: 768px)");
    const apply = () => setIsDesktop(media.matches);
    apply();
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, []);

  const items = watch("items") ?? [];
  const totals = calcTotals(
    items.map((it) => ({
      quantity: Number(it?.quantity ?? 0),
      price: Number(it?.price ?? 0),
    })),
  );

  type RowData = { fieldId: string; idx: number };
  const data: RowData[] = useMemo(() => fields.map((f, idx) => ({ fieldId: f.id, idx })), [fields]);

  const columns = useMemo<ColumnDef<RowData>[]>(
    () => [
      {
        id: "index",
        header: "#",
        cell: ({ row }) => (
          <td className="align-middle px-3 py-2 text-zinc-500">{row.original.idx + 1}</td>
        ),
      },
      {
        id: "title",
        header: "Назва",
        cell: ({ row }) => (
          <td className="align-middle w-[38%] min-w-[320px] px-3 py-2">
            <textarea
              className="min-h-10 w-full rounded-md border px-3 py-2"
              rows={2}
              {...register(`items.${row.original.idx}.title`, { required: true })}
            />
          </td>
        ),
      },
      {
        id: "unit",
        header: "Од. вим.",
        cell: ({ row }) => (
          <td className="align-middle px-3 py-2">
            <input className="h-10 w-full rounded-md border px-3" {...register(`items.${row.original.idx}.unit`, { required: true })} />
          </td>
        ),
      },
      {
        id: "quantity",
        header: "К-сть",
        cell: ({ row }) => (
          <td className="align-middle px-3 py-2">
            <input
              type="text"
              inputMode="decimal"
              className="h-10 w-full rounded-md border px-3"
              {...register(`items.${row.original.idx}.quantity`, { required: true })}
            />
          </td>
        ),
      },
      {
        id: "price",
        header: "Ціна без ПДВ",
        cell: ({ row }) => (
          <td className="align-middle px-3 py-2">
            <input
              type="text"
              inputMode="decimal"
              className="h-10 w-full rounded-md border px-3"
              {...register(`items.${row.original.idx}.price`, {
                required: true,
                onBlur: (e) => {
                  const next = formatPriceTwoDecimals(e.target.value);
                  if (next !== e.target.value) {
                    setValue(`items.${row.original.idx}.price`, next, {
                      shouldValidate: true,
                      shouldDirty: true,
                    });
                  }
                },
              })}
            />
          </td>
        ),
      },
      {
        id: "sum",
        header: "Сума без ПДВ",
        cell: ({ row }) => {
          const q = Number(items[row.original.idx]?.quantity ?? 0);
          const p = Number(items[row.original.idx]?.price ?? 0);
          const rowTotal = q * p;
          return (
            <td className="align-middle px-3 py-2 text-center tabular-nums">
              {formatMoney(Number.isFinite(rowTotal) ? rowTotal : 0)}
            </td>
          );
        },
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => (
          <td className="align-middle px-3 py-2">
            <button
              type="button"
              className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-50"
              onClick={() => setPendingDeleteIdx(row.original.idx)}
              disabled={fields.length <= 1}
              aria-label={fields.length <= 1 ? "Не можна видалити останній рядок" : "Видалити рядок"}
              title={fields.length <= 1 ? "Не можна видалити останній рядок" : "Видалити рядок"}
            >
              <FiTrash2 className="size-4" aria-hidden="true" />
            </button>
          </td>
        ),
      },
    ],
    [fields.length, items, register, remove, setValue],
  );

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className="rounded-xl border bg-white">
      {/* Desktop/table view */}
      <div className="hidden overflow-x-auto md:block">
        {isDesktop ? (
          <table className="w-full text-sm">
            <thead className="bg-[#FFF7E5] text-left text-zinc-700">
              {table.getHeaderGroups().map((hg) => (
                <tr key={hg.id}>
                  {hg.headers.map((header) => (
                    <th key={header.id} className={header.id === "title" ? "w-[38%] min-w-[320px] px-3 py-2" : "px-3 py-2"}>
                      {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {table.getRowModel().rows.map((row) => (
                <tr key={row.original.fieldId} className="border-t align-middle">
                  {row.getVisibleCells().map((cell) => (
                    <Fragment key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</Fragment>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        ) : null}
      </div>

      {/* Mobile/card view */}
      <div className="flex flex-col gap-3 p-3 md:hidden">
        {!isDesktop
          ? table.getRowModel().rows.map((row) => {
            const idx = row.original.idx;
            const q = Number(items[idx]?.quantity ?? 0);
            const p = Number(items[idx]?.price ?? 0);
            const rowTotal = q * p;
            return (
              <div key={row.original.fieldId} className="rounded-xl border bg-white p-3">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <div className="text-sm font-semibold text-zinc-900">Рядок #{idx + 1}</div>
                  <button
                    type="button"
                    className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-50"
                    onClick={() => setPendingDeleteIdx(idx)}
                    disabled={fields.length <= 1}
                    aria-label={fields.length <= 1 ? "Не можна видалити останній рядок" : "Видалити рядок"}
                    title={fields.length <= 1 ? "Не можна видалити останній рядок" : "Видалити рядок"}
                  >
                    <FiTrash2 className="size-4" aria-hidden="true" />
                  </button>
                </div>

                <div className="grid grid-cols-1 gap-2">
                  <label className="flex flex-col gap-1 text-sm">
                    <span className="text-zinc-700">Назва</span>
                    <textarea
                      className="min-h-10 w-full rounded-md border px-3 py-2"
                      rows={2}
                      {...register(`items.${idx}.title`, { required: true })}
                    />
                  </label>

                  <label className="flex flex-col gap-1 text-sm">
                    <span className="text-zinc-700">Од. вим.</span>
                    <input className="h-10 w-full rounded-md border px-3" {...register(`items.${idx}.unit`, { required: true })} />
                  </label>

                  <div className="grid grid-cols-2 gap-2">
                    <label className="flex flex-col gap-1 text-sm">
                      <span className="text-zinc-700">К-сть</span>
                      <input
                        type="text"
                        inputMode="decimal"
                        className="h-10 w-full rounded-md border px-3"
                        {...register(`items.${idx}.quantity`, { required: true })}
                      />
                    </label>

                    <label className="flex flex-col gap-1 text-sm">
                      <span className="text-zinc-700">Ціна без ПДВ</span>
                      <input
                        type="text"
                        inputMode="decimal"
                        className="h-10 w-full rounded-md border px-3"
                        {...register(`items.${idx}.price`, {
                          required: true,
                          onBlur: (e) => {
                            const next = formatPriceTwoDecimals(e.target.value);
                            if (next !== e.target.value) {
                              setValue(`items.${idx}.price`, next, {
                                shouldValidate: true,
                                shouldDirty: true,
                              });
                            }
                          },
                        })}
                      />
                    </label>
                  </div>

                  <div className="flex justify-end text-sm tabular-nums text-zinc-900">
                    {formatMoney(Number.isFinite(rowTotal) ? rowTotal : 0)}
                  </div>
                </div>
              </div>
            );
          })
          : null}
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
              {formatMoney(totals.totalWithoutVat)}
            </span>
          </div>
          <div className="flex justify-end gap-4">
            <span>ПДВ 20%:</span>
            <span>
              {formatMoney(totals.vat20)}
            </span>
          </div>
          <div className="flex justify-end gap-4 font-semibold">
            <span>Разом з ПДВ:</span>
            <span>
              {formatMoney(totals.totalWithVat)}
            </span>
          </div>
        </div>
      </div>

      <Dialog.Root open={pendingDeleteIdx !== null} onOpenChange={(next) => !next && setPendingDeleteIdx(null)}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/40" />
          <Dialog.Content className="fixed left-1/2 top-1/2 w-[min(420px,calc(100vw-24px))] -translate-x-1/2 -translate-y-1/2 rounded-xl bg-white p-4 shadow-lg">
            <Dialog.Title className="text-sm font-semibold text-zinc-900">Підтвердження видалення</Dialog.Title>
            <Dialog.Description className="mt-2 text-sm text-zinc-700">
              Ви дійсно хочете видалити цей рядок? Цю дію не можна скасувати.
            </Dialog.Description>
            <div className="mt-4 flex justify-end gap-2">
              <Dialog.Close asChild>
                <button type="button" className="h-9 rounded-md border px-3 text-sm hover:bg-zinc-50">
                  Скасувати
                </button>
              </Dialog.Close>
              <Dialog.Close asChild>
                <button
                  type="button"
                  className="h-9 rounded-md bg-red-600 px-3 text-sm text-white hover:bg-red-700"
                  onClick={() => {
                    if (pendingDeleteIdx === null) return;
                    remove(pendingDeleteIdx);
                    setPendingDeleteIdx(null);
                  }}
                >
                  Видалити
                </button>
              </Dialog.Close>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}

