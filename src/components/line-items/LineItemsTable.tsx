"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Settings2 } from "lucide-react";
import { Controller, useFieldArray, useFormContext, useWatch } from "react-hook-form";
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
    sourceContractLineItemId?: string | null;
  }>;
};

export type ContractLineCatalogEntry = {
  id: string;
  title: string;
  unit: string;
  price: number;
  /** Скільки ще можна виставити по цьому рядку договору в межах цього рахунку. */
  remaining: number;
};

/** Default props must use stable references — `= []` in parameters creates a new array every render and invalidates useMemo/useCallback (recreates table columns each keystroke). */
const EMPTY_UNIT_OPTIONS: string[] = [];
const EMPTY_CONTRACT_CATALOG: ContractLineCatalogEntry[] = [];

function maxQtyForContractLineOnRow(
  rowIdx: number,
  lineId: string,
  catalog: ContractLineCatalogEntry[],
  items: LineItemForm["items"],
): number {
  const L = catalog.find((c) => c.id === lineId);
  if (!L) return 0;
  let usedElsewhere = 0;
  for (let k = 0; k < items.length; k++) {
    if (k === rowIdx) continue;
    if (items[k]?.sourceContractLineItemId === lineId) {
      usedElsewhere += Number(items[k]?.quantity ?? 0);
    }
  }
  return Math.max(0, L.remaining - usedElsewhere);
}

function buildContractLineOptionsForRow(
  rowIdx: number,
  catalog: ContractLineCatalogEntry[],
  items: LineItemForm["items"],
): { id: string; label: string }[] {
  const out: { id: string; label: string }[] = [];
  for (const L of catalog) {
    const max = maxQtyForContractLineOnRow(rowIdx, L.id, catalog, items);
    const isCurrent = items[rowIdx]?.sourceContractLineItemId === L.id;
    if (max > 1e-9 || isCurrent) {
      out.push({
        id: L.id,
        label: `${L.title} · ${L.unit} — ${formatMoney(L.price)} (макс. ${max.toFixed(2)})`,
      });
    }
  }
  return out;
}

/** Desktop `<colgroup>` (table-fixed): fixed px + назва забирає решту ширини. */
const LINE_ITEMS_DESKTOP_COLGROUP = [
  "w-[40px]",
  "min-w-0",
  "w-[100px]",
  "w-[80px]",
  "w-[120px]",
  "w-[120px]",
  "w-[60px]",
] as const;

/** Unit options from parent — cells read via context so prop identity does not matter. */
const LineItemsUnitOptionsContext = createContext<string[]>([]);

/** Isolated inputs — avoid recreating column defs on each keystroke (see EMPTY_* defaults). */
function LineItemTitleField({ idx }: { idx: number }) {
  const { register } = useFormContext<LineItemForm>();
  return (
    <textarea
      className="min-h-10 w-full min-w-0 max-w-full rounded-md border px-3 py-2"
      rows={2}
      {...register(`items.${idx}.title`, { required: true })}
    />
  );
}

function LineItemQuantityInput({ idx }: { idx: number }) {
  const { register } = useFormContext<LineItemForm>();
  return (
    <input
      type="text"
      inputMode="decimal"
      className="h-10 w-full min-w-0 max-w-full rounded-md border px-3"
      {...register(`items.${idx}.quantity`, { required: true })}
    />
  );
}

function LineItemsUnitColumnHeader({ onManage }: { onManage: () => void }) {
  return (
    <div className="flex min-w-0 flex-col gap-1" title="Одиниці виміру">
      <span className="whitespace-normal break-words text-left leading-tight">Од. вим.</span>
      <button
        type="button"
        className="inline-flex size-7 shrink-0 items-center justify-center self-start rounded-md border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50"
        onClick={onManage}
        title="Керувати одиницями виміру"
        aria-label="Керувати одиницями виміру"
      >
        <Settings2 className="size-3.5" aria-hidden />
      </button>
    </div>
  );
}

function LineItemUnitDesktopCell({ idx }: { idx: number }) {
  const { control } = useFormContext<LineItemForm>();
  const unitOptionsFromBackend = useContext(LineItemsUnitOptionsContext);
  return (
    <td className={lineItemDesktopColClass("unit", "td")}>
      <div className="min-w-0 max-w-full">
        <Controller
          name={`items.${idx}.unit`}
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
  );
}

function LineItemPriceField({ idx }: { idx: number }) {
  const { register, setValue } = useFormContext<LineItemForm>();
  return (
    <input
      type="text"
      inputMode="decimal"
      className="h-10 w-full min-w-0 max-w-full rounded-md border px-3"
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
  );
}

function LineItemSumCell({ idx }: { idx: number }) {
  const row = useWatch({ name: `items.${idx}` });
  const q = Number(row?.quantity ?? 0);
  const p = Number(row?.price ?? 0);
  const rowTotal = q * p;
  return (
    <td className={cn(lineItemDesktopColClass("sum", "td"), "text-center tabular-nums break-words")}>
      {formatMoney(Number.isFinite(rowTotal) ? rowTotal : 0)}
    </td>
  );
}

function ContractPositionCell({
  idx,
  contractLineCatalog,
  applyContractLineToRow,
}: {
  idx: number;
  contractLineCatalog: ContractLineCatalogEntry[];
  applyContractLineToRow: (i: number, lineId: string | null) => void;
}) {
  const { register, control } = useFormContext<LineItemForm>();
  const items = useWatch({ name: "items" }) ?? [];
  const opts = buildContractLineOptionsForRow(idx, contractLineCatalog, items);
  return (
    <td className={lineItemDesktopColClass("title", "td")}>
      <Controller
        name={`items.${idx}.sourceContractLineItemId`}
        control={control}
        rules={{ required: true }}
        render={({ field }) => (
          <select
            className="h-auto min-h-10 w-full min-w-0 rounded-md border px-3 py-2"
            value={field.value ?? ""}
            onChange={(e) => {
              const v = e.target.value;
              field.onChange(v || null);
              applyContractLineToRow(idx, v || null);
            }}
          >
            <option value="">Оберіть позицію з договору…</option>
            {opts.map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
          </select>
        )}
      />
      <input type="hidden" {...register(`items.${idx}.title`)} />
    </td>
  );
}

function ContractUnitReadonlyCell({ idx }: { idx: number }) {
  const unit = useWatch({ name: `items.${idx}.unit` });
  return (
    <td className={lineItemDesktopColClass("unit", "td")}>
      <input
        readOnly
        tabIndex={-1}
        className="h-10 w-full min-w-0 cursor-default rounded-md border border-border bg-muted px-3 text-sm"
        value={String(unit ?? "")}
      />
    </td>
  );
}

function ContractQuantityCell({
  idx,
  contractLineCatalog,
}: {
  idx: number;
  contractLineCatalog: ContractLineCatalogEntry[];
}) {
  const { register, setValue, getValues } = useFormContext<LineItemForm>();
  const items = useWatch({ name: "items" }) ?? [];
  const lineId = items[idx]?.sourceContractLineItemId;
  const maxQ =
    lineId != null && lineId !== ""
      ? maxQtyForContractLineOnRow(idx, lineId, contractLineCatalog, items)
      : undefined;
  return (
    <td className={lineItemDesktopColClass("quantity", "td")}>
      <input
        type="text"
        inputMode="decimal"
        title={maxQ != null ? `Максимум: ${maxQ.toFixed(2)}` : undefined}
        className="h-10 w-full min-w-0 max-w-full rounded-md border px-3"
        {...register(`items.${idx}.quantity`, {
          required: true,
          onBlur: (e) => {
            if (!lineId) return;
            const max = maxQtyForContractLineOnRow(idx, lineId, contractLineCatalog, getValues("items") ?? []);
            const v = Number.parseFloat(String(e.target.value).replace(",", "."));
            if (Number.isFinite(v) && v > max + 1e-9) {
              setValue(`items.${idx}.quantity`, max, { shouldDirty: true });
              toast.error(`Максимальна кількість для цієї позиції: ${max.toFixed(2)}.`);
            }
          },
        })}
      />
    </td>
  );
}

function ContractPriceReadonlyCell({ idx }: { idx: number }) {
  const { register } = useFormContext<LineItemForm>();
  const price = useWatch({ name: `items.${idx}.price` });
  return (
    <td className={lineItemDesktopColClass("price", "td")}>
      <input
        readOnly
        tabIndex={-1}
        className="h-10 w-full min-w-0 cursor-default rounded-md border border-border bg-muted px-3 text-sm tabular-nums"
        value={formatPriceTwoDecimals(String(price ?? "0"))}
      />
      <input type="hidden" {...register(`items.${idx}.price`)} />
    </td>
  );
}

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
      return cn(base, "align-middle w-[80px] max-w-[80px] overflow-hidden px-3");
    case "price":
    case "sum":
      return cn(base, "align-middle w-[120px] max-w-[120px] overflow-hidden px-3");
    case "actions":
      return cn(base, "align-middle w-[60px] max-w-[60px] overflow-hidden px-2 text-center");
    default:
      return cn(base, "align-middle min-w-0 overflow-hidden px-3");
  }
}

export function LineItemsTable({
  unitOptionsFromBackend = EMPTY_UNIT_OPTIONS,
  contractInvoiceMode = false,
  contractLineCatalog = EMPTY_CONTRACT_CATALOG,
}: {
  unitOptionsFromBackend?: string[];
  contractInvoiceMode?: boolean;
  contractLineCatalog?: ContractLineCatalogEntry[];
}) {
  const { register, watch, setValue, control, getValues } = useFormContext<LineItemForm>();
  const { fields, append, remove } = useFieldArray({ name: "items" });
  const [pendingDeleteIdx, setPendingDeleteIdx] = useState<number | null>(null);
  const [unitManageOpen, setUnitManageOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);

  const contractUi = contractInvoiceMode && contractLineCatalog.length > 0;

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
  /** `fields` from useFieldArray often gets a new array reference on each form value update; TanStack Table then remounts rows and inputs lose focus. Keep the same `data` reference until row ids / count change. */
  const tableRowsRef = useRef<{ key: string; rows: RowData[] }>({ key: "", rows: [] });
  const structureKey = `${fields.length}:${fields.map((f) => f.id).join("|")}`;
  if (tableRowsRef.current.key !== structureKey) {
    tableRowsRef.current = {
      key: structureKey,
      rows: fields.map((f, idx) => ({ fieldId: f.id, idx })),
    };
  }
  const data = tableRowsRef.current.rows;

  const applyContractLineToRow = useCallback(
    (idx: number, lineId: string | null) => {
      if (!lineId) {
        setValue(`items.${idx}.sourceContractLineItemId`, null, { shouldDirty: true });
        setValue(`items.${idx}.title`, "", { shouldDirty: true });
        setValue(`items.${idx}.unit`, "", { shouldDirty: true });
        setValue(`items.${idx}.price`, 0, { shouldDirty: true });
        return;
      }
      const line = contractLineCatalog.find((c) => c.id === lineId);
      if (!line) return;
      setValue(`items.${idx}.sourceContractLineItemId`, lineId, { shouldDirty: true });
      setValue(`items.${idx}.title`, line.title, { shouldDirty: true });
      setValue(`items.${idx}.unit`, line.unit, { shouldDirty: true });
      setValue(`items.${idx}.price`, line.price, { shouldDirty: true });
      const nextItems = [...(getValues("items") ?? [])];
      nextItems[idx] = {
        ...nextItems[idx],
        sourceContractLineItemId: lineId,
        title: line.title,
        unit: line.unit,
        price: line.price,
      };
      const maxQ = maxQtyForContractLineOnRow(idx, lineId, contractLineCatalog, nextItems);
      const q = Number(nextItems[idx]?.quantity ?? 0);
      if (q > maxQ) setValue(`items.${idx}.quantity`, maxQ, { shouldDirty: true });
    },
    [contractLineCatalog, getValues, setValue],
  );

  return (
    <LineItemsUnitOptionsContext.Provider value={unitOptionsFromBackend}>
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
              {contractUi ? (
                <tr>
                  <th className={lineItemDesktopColClass("index", "th")}>#</th>
                  <th className={lineItemDesktopColClass("title", "th")}>Позиція договору</th>
                  <th className={lineItemDesktopColClass("unit", "th")}>Од. вим.</th>
                  <th className={lineItemDesktopColClass("quantity", "th")}>К-сть</th>
                  <th className={lineItemDesktopColClass("price", "th")}>Ціна без ПДВ</th>
                  <th className={lineItemDesktopColClass("sum", "th")}>Сума без ПДВ</th>
                  <th className={lineItemDesktopColClass("actions", "th")} />
                </tr>
              ) : (
                <tr>
                  <th className={lineItemDesktopColClass("index", "th")}>#</th>
                  <th className={lineItemDesktopColClass("title", "th")}>Назва</th>
                  <th className={lineItemDesktopColClass("unit", "th")}>
                    <LineItemsUnitColumnHeader onManage={() => setUnitManageOpen(true)} />
                  </th>
                  <th className={lineItemDesktopColClass("quantity", "th")}>К-сть</th>
                  <th className={lineItemDesktopColClass("price", "th")}>Ціна без ПДВ</th>
                  <th className={lineItemDesktopColClass("sum", "th")}>Сума без ПДВ</th>
                  <th className={lineItemDesktopColClass("actions", "th")} />
                </tr>
              )}
            </thead>
            <tbody>
              {contractUi
                ? data.map((row) => (
                    <tr key={row.fieldId} className="border-t align-middle">
                      <td className={cn(lineItemDesktopColClass("index", "td"), "text-zinc-500")}>{row.idx + 1}</td>
                      <ContractPositionCell
                        idx={row.idx}
                        contractLineCatalog={contractLineCatalog}
                        applyContractLineToRow={applyContractLineToRow}
                      />
                      <ContractUnitReadonlyCell idx={row.idx} />
                      <ContractQuantityCell idx={row.idx} contractLineCatalog={contractLineCatalog} />
                      <ContractPriceReadonlyCell idx={row.idx} />
                      <LineItemSumCell idx={row.idx} />
                      <td className={lineItemDesktopColClass("actions", "td")}>
                        <button
                          type="button"
                          className="inline-flex size-9 shrink-0 items-center justify-center rounded-md border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-50"
                          onClick={() => setPendingDeleteIdx(row.idx)}
                          disabled={fields.length <= 1}
                          aria-label={fields.length <= 1 ? "Не можна видалити останній рядок" : "Видалити рядок"}
                          title={fields.length <= 1 ? "Не можна видалити останній рядок" : "Видалити рядок"}
                        >
                          <FiTrash2 className="size-4" aria-hidden="true" />
                        </button>
                      </td>
                    </tr>
                  ))
                : data.map((row) => (
                    <tr key={row.fieldId} className="border-t align-middle">
                      <td className={cn(lineItemDesktopColClass("index", "td"), "text-zinc-500")}>{row.idx + 1}</td>
                      <td className={lineItemDesktopColClass("title", "td")}>
                        <LineItemTitleField idx={row.idx} />
                      </td>
                      <LineItemUnitDesktopCell idx={row.idx} />
                      <td className={lineItemDesktopColClass("quantity", "td")}>
                        <LineItemQuantityInput idx={row.idx} />
                      </td>
                      <td className={lineItemDesktopColClass("price", "td")}>
                        <LineItemPriceField idx={row.idx} />
                      </td>
                      <LineItemSumCell idx={row.idx} />
                      <td className={lineItemDesktopColClass("actions", "td")}>
                        <button
                          type="button"
                          className="inline-flex size-9 shrink-0 items-center justify-center rounded-md border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-50"
                          onClick={() => setPendingDeleteIdx(row.idx)}
                          disabled={fields.length <= 1}
                          aria-label={fields.length <= 1 ? "Не можна видалити останній рядок" : "Видалити рядок"}
                          title={fields.length <= 1 ? "Не можна видалити останній рядок" : "Видалити рядок"}
                        >
                          <FiTrash2 className="size-4" aria-hidden="true" />
                        </button>
                      </td>
                    </tr>
                  ))}
            </tbody>
          </table>
        ) : null}
      </div>

      {/* Mobile/card view */}
      <div className="flex flex-col gap-3 p-3 md:hidden">
        {!isDesktop
          ? data.map((row) => {
              const idx = row.idx;
              const q = Number(items[idx]?.quantity ?? 0);
              const p = Number(items[idx]?.price ?? 0);
              const rowTotal = q * p;
              const lineId = items[idx]?.sourceContractLineItemId;
              const maxQ =
                contractUi && lineId != null && lineId !== ""
                  ? maxQtyForContractLineOnRow(idx, lineId, contractLineCatalog, items)
                  : undefined;

              return (
                <div key={row.fieldId} className="rounded-xl border bg-white p-3">
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
                    {contractUi ? (
                      <>
                        <label className="flex flex-col gap-1 text-sm">
                          <span className="text-zinc-700">Позиція договору</span>
                          <Controller
                            name={`items.${idx}.sourceContractLineItemId`}
                            control={control}
                            rules={{ required: true }}
                            render={({ field }) => (
                              <select
                                className="h-auto min-h-10 w-full rounded-md border px-3 py-2"
                                value={field.value ?? ""}
                                onChange={(e) => {
                                  const v = e.target.value;
                                  field.onChange(v || null);
                                  applyContractLineToRow(idx, v || null);
                                }}
                              >
                                <option value="">Оберіть позицію з договору…</option>
                                {buildContractLineOptionsForRow(idx, contractLineCatalog, items).map((o) => (
                                  <option key={o.id} value={o.id}>
                                    {o.label}
                                  </option>
                                ))}
                              </select>
                            )}
                          />
                          <input type="hidden" {...register(`items.${idx}.title`)} />
                        </label>

                        <label className="flex flex-col gap-1 text-sm">
                          <span className="text-zinc-700">Од. вим.</span>
                          <input
                            readOnly
                            tabIndex={-1}
                            className="h-10 w-full cursor-default rounded-md border border-border bg-muted px-3"
                            value={String(items[idx]?.unit ?? "")}
                          />
                        </label>

                        <div className="grid grid-cols-2 gap-2">
                          <label className="flex flex-col gap-1 text-sm">
                            <span className="text-zinc-700">К-сть</span>
                            <input
                              type="text"
                              inputMode="decimal"
                              title={maxQ != null ? `Максимум: ${maxQ.toFixed(2)}` : undefined}
                              className="h-10 w-full rounded-md border px-3"
                              {...register(`items.${idx}.quantity`, {
                                required: true,
                                onBlur: (e) => {
                                  if (!lineId) return;
                                  const max = maxQtyForContractLineOnRow(
                                    idx,
                                    lineId,
                                    contractLineCatalog,
                                    getValues("items") ?? [],
                                  );
                                  const v = Number.parseFloat(String(e.target.value).replace(",", "."));
                                  if (Number.isFinite(v) && v > max + 1e-9) {
                                    setValue(`items.${idx}.quantity`, max, { shouldDirty: true });
                                    toast.error(`Максимальна кількість для цієї позиції: ${max.toFixed(2)}.`);
                                  }
                                },
                              })}
                            />
                          </label>

                          <label className="flex flex-col gap-1 text-sm">
                            <span className="text-zinc-700">Ціна без ПДВ</span>
                            <input
                              readOnly
                              tabIndex={-1}
                              className="h-10 w-full cursor-default rounded-md border border-border bg-muted px-3 tabular-nums"
                              value={formatPriceTwoDecimals(String(items[idx]?.price ?? "0"))}
                            />
                            <input type="hidden" {...register(`items.${idx}.price`)} />
                          </label>
                        </div>
                      </>
                    ) : (
                      <>
                        <label className="flex flex-col gap-1 text-sm">
                          <span className="text-zinc-700">Назва</span>
                          <LineItemTitleField idx={idx} />
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
                      </>
                    )}

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
          onClick={() =>
            append({ title: "", unit: "", quantity: 0, price: 0, sourceContractLineItemId: null })
          }
        >
          {contractUi ? "+ Додати позицію з договору" : "+ Додати рядок"}
        </button>
        <div className="min-w-0 text-sm tabular-nums text-zinc-700">
          <div className="flex flex-wrap justify-end gap-x-4 gap-y-1">
            <span>Разом (без ПДВ):</span>
            <span>{formatMoney(totals.totalWithoutVat)}</span>
          </div>
          <div className="flex flex-wrap justify-end gap-x-4 gap-y-1">
            <span>ПДВ 20%:</span>
            <span>{formatMoney(totals.vat20)}</span>
          </div>
          <div className="flex flex-wrap justify-end gap-x-4 gap-y-1 font-semibold">
            <span>Разом з ПДВ:</span>
            <span>{formatMoney(totals.totalWithVat)}</span>
          </div>
        </div>
      </div>

      {!contractUi ? (
        <ManageLineItemUnitsDialog
          open={unitManageOpen}
          onOpenChange={setUnitManageOpen}
          optionsFromBackend={unitOptionsFromBackend}
        />
      ) : null}

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
    </LineItemsUnitOptionsContext.Provider>
  );
}
