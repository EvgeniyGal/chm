"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Settings2 } from "lucide-react";
import { Controller, useFieldArray, useFormContext } from "react-hook-form";
import { flexRender, getCoreRowModel, useReactTable, type ColumnDef } from "@tanstack/react-table";
import { FiTrash2 } from "react-icons/fi";
import { toast } from "sonner";

import { SearchableDropdownOptionField } from "@/components/forms/SearchableDropdownOptionField";
import { ManageLineItemUnitsDialog } from "@/components/line-items/ManageLineItemUnitsDialog";
import { calcTotals, formatMoney } from "@/lib/totals";
import { cn } from "@/lib/utils";

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

/** Desktop `<colgroup>` (table-fixed): fixed px + назва забирає решту ширини. */
const LINE_ITEMS_DESKTOP_COLGROUP = [
  "w-[40px]",
  "min-w-0",
  "w-[100px]",
  "w-[100px]",
  "w-[100px]",
  "w-[100px]",
  "w-[60px]",
] as const;

function lineItemDesktopColClass(columnId: string, tag: "th" | "td"): string {
  const base = "box-border whitespace-normal py-2";
  switch (columnId) {
    case "index":
      return cn(base, "align-middle w-[40px] max-w-[40px] overflow-hidden px-2 text-center");
    case "title":
      return cn(base, "align-middle min-w-0 overflow-hidden px-3");
    case "unit":
      return cn(
        base,
        tag === "th" ? "align-top overflow-visible" : "align-middle overflow-hidden",
        "w-[100px] max-w-[100px] px-3",
      );
    case "quantity":
    case "price":
    case "sum":
      return cn(base, "align-middle w-[100px] max-w-[100px] overflow-hidden px-3");
    case "actions":
      return cn(base, "align-middle w-[60px] max-w-[60px] overflow-hidden px-2 text-center");
    default:
      return cn(base, "align-middle min-w-0 overflow-hidden px-3");
  }
}

export function LineItemsTable({ unitOptionsFromBackend = [] }: { unitOptionsFromBackend?: string[] }) {
  const { register, watch, setValue, control } = useFormContext<LineItemForm>();
  const { fields, append, remove } = useFieldArray({ name: "items" });
  const [pendingDeleteIdx, setPendingDeleteIdx] = useState<number | null>(null);
  const [unitManageOpen, setUnitManageOpen] = useState(false);
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
          <td className={cn(lineItemDesktopColClass("index", "td"), "text-zinc-500")}>{row.original.idx + 1}</td>
        ),
      },
      {
        id: "title",
        header: "Назва",
        cell: ({ row }) => (
          <td className={lineItemDesktopColClass("title", "td")}>
            <textarea
              className="min-h-10 w-full min-w-0 max-w-full rounded-md border px-3 py-2"
              rows={2}
              {...register(`items.${row.original.idx}.title`, { required: true })}
            />
          </td>
        ),
      },
      {
        id: "unit",
        header: () => (
          <div
            className="flex min-w-0 flex-col gap-1"
            title="Одиниці виміру"
          >
            <span className="whitespace-normal break-words text-left leading-tight">
              Од. вим.
            </span>
            <button
              type="button"
              className="inline-flex size-7 shrink-0 items-center justify-center self-start rounded-md border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50"
              onClick={() => setUnitManageOpen(true)}
              title="Керувати одиницями виміру"
              aria-label="Керувати одиницями виміру"
            >
              <Settings2 className="size-3.5" aria-hidden />
            </button>
          </div>
        ),
        cell: ({ row }) => (
          <td className={lineItemDesktopColClass("unit", "td")}>
            <div className="min-w-0 max-w-full">
              <Controller
                name={`items.${row.original.idx}.unit`}
                control={control}
                rules={{ required: true }}
                render={({ field }) => (
                  <SearchableDropdownOptionField
                    label="Одиниця виміру"
                    hideLabel
                    scope="LINE_ITEM_UNIT"
                    value={field.value ?? ""}
                    onChange={field.onChange}
                    optionsFromBackend={unitOptionsFromBackend}
                    placeholder="Оберіть або введіть одиницю"
                    inputClassName="bg-white"
                    showManageButtons={false}
                  />
                )}
              />
            </div>
          </td>
        ),
      },
      {
        id: "quantity",
        header: "К-сть",
        cell: ({ row }) => (
          <td className={lineItemDesktopColClass("quantity", "td")}>
            <input
              type="text"
              inputMode="decimal"
              className="h-10 w-full min-w-0 max-w-full rounded-md border px-3"
              {...register(`items.${row.original.idx}.quantity`, { required: true })}
            />
          </td>
        ),
      },
      {
        id: "price",
        header: "Ціна без ПДВ",
        cell: ({ row }) => (
          <td className={lineItemDesktopColClass("price", "td")}>
            <input
              type="text"
              inputMode="decimal"
              className="h-10 w-full min-w-0 max-w-full rounded-md border px-3"
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
            <td className={cn(lineItemDesktopColClass("sum", "td"), "text-center tabular-nums break-words")}>
              {formatMoney(Number.isFinite(rowTotal) ? rowTotal : 0)}
            </td>
          );
        },
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => (
          <td className={lineItemDesktopColClass("actions", "td")}>
            <button
              type="button"
              className="inline-flex size-9 shrink-0 items-center justify-center rounded-md border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-50"
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
    [control, fields.length, items, register, remove, setValue, unitOptionsFromBackend],
  );

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className="min-w-0 max-w-full rounded-xl border bg-white">
      {/* Desktop/table view */}
      <div className="hidden min-w-0 max-w-full overflow-x-hidden md:block">
        {isDesktop ? (
          <table className="w-full max-w-full table-fixed border-collapse text-sm">
            <colgroup>
              {LINE_ITEMS_DESKTOP_COLGROUP.map((cls, i) => (
                <col key={i} className={cls} />
              ))}
            </colgroup>
            <thead className="bg-crm-table-header text-left text-sm font-semibold text-foreground/90">
              {table.getHeaderGroups().map((hg) => (
                <tr key={hg.id}>
                  {hg.headers.map((header) => (
                    <th key={header.id} className={lineItemDesktopColClass(header.id, "th")}>
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
                  <div className="text-sm font-semibold text-foreground">Рядок #{idx + 1}</div>
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

                  <div>
                    <div className="mb-1 flex items-center justify-between gap-2">
                      <span className="text-zinc-700">Од. вим.</span>
                      <button
                        type="button"
                        className="inline-flex shrink-0 items-center justify-center rounded-md border border-zinc-200 bg-white p-1 text-zinc-600 hover:bg-zinc-50"
                        onClick={() => setUnitManageOpen(true)}
                        title="Керувати одиницями виміру"
                        aria-label="Керувати одиницями виміру"
                      >
                        <Settings2 className="size-4" aria-hidden />
                      </button>
                    </div>
                    <Controller
                      name={`items.${idx}.unit`}
                      control={control}
                      rules={{ required: true }}
                      render={({ field }) => (
                        <SearchableDropdownOptionField
                          label="Од. вим."
                          hideLabel
                          scope="LINE_ITEM_UNIT"
                          value={field.value ?? ""}
                          onChange={field.onChange}
                          optionsFromBackend={unitOptionsFromBackend}
                          placeholder="Оберіть або введіть одиницю"
                          inputClassName="bg-white"
                          showManageButtons={false}
                        />
                      )}
                    />
                  </div>

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

                  <div className="flex justify-end text-sm tabular-nums text-foreground">
                    {formatMoney(Number.isFinite(rowTotal) ? rowTotal : 0)}
                  </div>
                </div>
              </div>
            );
          })
          : null}
      </div>

      <div className="flex min-w-0 flex-wrap items-center justify-between gap-3 border-t p-3">
        <button
          type="button"
          className="inline-flex h-10 shrink-0 items-center rounded-md border px-4 text-sm hover:bg-zinc-50"
          onClick={() => append({ title: "", unit: "", quantity: 0, price: 0 })}
        >
          + Додати рядок
        </button>
        <div className="min-w-0 text-sm tabular-nums text-zinc-700">
          <div className="flex flex-wrap justify-end gap-x-4 gap-y-1">
            <span>Разом (без ПДВ):</span>
            <span>
              {formatMoney(totals.totalWithoutVat)}
            </span>
          </div>
          <div className="flex flex-wrap justify-end gap-x-4 gap-y-1">
            <span>ПДВ 20%:</span>
            <span>
              {formatMoney(totals.vat20)}
            </span>
          </div>
          <div className="flex flex-wrap justify-end gap-x-4 gap-y-1 font-semibold">
            <span>Разом з ПДВ:</span>
            <span>
              {formatMoney(totals.totalWithVat)}
            </span>
          </div>
        </div>
      </div>

      <ManageLineItemUnitsDialog
        open={unitManageOpen}
        onOpenChange={setUnitManageOpen}
        optionsFromBackend={unitOptionsFromBackend}
      />

      <Dialog.Root open={pendingDeleteIdx !== null} onOpenChange={(next) => !next && setPendingDeleteIdx(null)}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/40" />
          <Dialog.Content className="fixed left-1/2 top-1/2 w-[min(420px,calc(100vw-24px))] -translate-x-1/2 -translate-y-1/2 rounded-xl bg-white p-4 shadow-lg">
            <Dialog.Title className="text-sm font-semibold text-foreground">Підтвердження видалення</Dialog.Title>
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
                    toast.success("Рядок видалено.");
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

