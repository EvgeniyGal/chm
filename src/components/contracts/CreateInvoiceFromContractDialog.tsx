"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import type { ContractLineInvoiceRemaining } from "@/lib/contract-invoice-remaining";
import { invoicePartialSelectionStorageKey } from "@/lib/invoice-from-contract-session";

export function CreateInvoiceFromContractDialog({
  open,
  onOpenChange,
  contractId,
  lines,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contractId: string;
  lines: ContractLineInvoiceRemaining[];
}) {
  const router = useRouter();
  const [step, setStep] = useState<"menu" | "pick">("menu");
  const billable = useMemo(() => lines.filter((l) => l.remaining > 0), [lines]);

  const [pick, setPick] = useState<Record<string, { on: boolean; qty: string }>>({});

  useEffect(() => {
    if (!open) return;
    setStep("menu");
    const next: Record<string, { on: boolean; qty: string }> = {};
    for (const l of billable) {
      next[l.id] = { on: false, qty: String(l.remaining) };
    }
    setPick(next);
  }, [open, billable]);

  function applyPartialAndGo() {
    const payload: Array<{ sourceContractLineItemId: string; quantity: number }> = [];
    for (const l of billable) {
      const row = pick[l.id];
      if (!row?.on) continue;
      const q = Number.parseFloat(String(row.qty).replace(",", "."));
      if (!Number.isFinite(q) || q <= 0) continue;
      const qty = Math.min(q, l.remaining);
      if (qty <= 0) continue;
      payload.push({ sourceContractLineItemId: l.id, quantity: qty });
    }
    if (payload.length === 0) {
      toast.error("Оберіть хоча б одну позицію з кількістю більше нуля.");
      return;
    }
    try {
      sessionStorage.setItem(
        invoicePartialSelectionStorageKey(contractId),
        JSON.stringify({ v: 1, lines: payload }),
      );
    } catch {
      toast.error("Не вдалося зберегти вибір. Спробуйте ще раз.");
      return;
    }
    onOpenChange(false);
    router.push(`/invoices/new?contractId=${contractId}&partial=1`);
  }

  const nothingToBill = billable.length === 0;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) setStep("menu");
      }}
    >
      <DialogContent className="max-h-[min(90vh,720px)] overflow-y-auto">
        <DialogTitle>Створити рахунок з договору</DialogTitle>

        {lines.length === 0 ? (
          <p className="text-sm text-muted-foreground">У договорі ще немає позицій для виставлення.</p>
        ) : nothingToBill ? (
          <p className="text-sm text-muted-foreground">
            Усі позиції договору вже повністю враховані в попередніх рахунках.
          </p>
        ) : step === "menu" ? (
          <div className="mt-2 flex flex-col gap-3">
            <p className="text-sm text-muted-foreground">
              Замовник, виконавець і підписант підставляться з договору та картки виконавця. У рахунок потраплять лише
              позиції з ненульовим залишком.
            </p>
            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
              <Link
                href={`/invoices/new?contractId=${contractId}`}
                className="crm-btn-primary inline-flex h-10 items-center justify-center rounded-md px-4 text-sm"
                onClick={() => onOpenChange(false)}
              >
                Усі доступні залишки
              </Link>
              <Button type="button" variant="outline" onClick={() => setStep("pick")}>
                Обрати позиції та кількості
              </Button>
            </div>
          </div>
        ) : (
          <div className="mt-3 flex flex-col gap-3">
            <p className="text-sm text-muted-foreground">
              Позначте позиції та вкажіть кількість (не більше залишку за договором).
            </p>
            <div className="max-h-[min(50vh,360px)] overflow-auto rounded-lg border">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-muted/80 text-left text-xs font-semibold uppercase text-muted-foreground">
                  <tr>
                    <th className="w-10 px-2 py-2" />
                    <th className="px-2 py-2">Позиція</th>
                    <th className="w-24 px-2 py-2">Залишок</th>
                    <th className="w-28 px-2 py-2">Кількість</th>
                  </tr>
                </thead>
                <tbody>
                  {billable.map((l) => {
                    const row = pick[l.id] ?? { on: false, qty: String(l.remaining) };
                    return (
                      <tr key={l.id} className="border-t">
                        <td className="px-2 py-2 align-top">
                          <input
                            type="checkbox"
                            className="mt-1 size-4 rounded border"
                            checked={row.on}
                            onChange={(e) =>
                              setPick((prev) => ({
                                ...prev,
                                [l.id]: { ...row, on: e.target.checked },
                              }))
                            }
                            aria-label={`Включити «${l.title.slice(0, 40)}»`}
                          />
                        </td>
                        <td className="px-2 py-2 align-top">
                          <div className="font-medium text-foreground">{l.title}</div>
                          <div className="text-xs text-muted-foreground">
                            {l.unit} · {l.price.toFixed(2)} без ПДВ
                          </div>
                        </td>
                        <td className="px-2 py-2 align-top tabular-nums">{l.remaining}</td>
                        <td className="px-2 py-2 align-top">
                          <input
                            type="text"
                            inputMode="decimal"
                            className="h-9 w-full min-w-0 rounded-md border px-2"
                            value={row.qty}
                            disabled={!row.on}
                            onChange={(e) =>
                              setPick((prev) => ({
                                ...prev,
                                [l.id]: { ...row, qty: e.target.value },
                              }))
                            }
                            aria-label="Кількість для рахунку"
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="flex flex-wrap justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setStep("menu")}>
                Назад
              </Button>
              <Button type="button" className="crm-btn-primary" onClick={() => void applyPartialAndGo()}>
                Далі — оформити рахунок
              </Button>
            </div>
          </div>
        )}

        {step === "menu" ? (
          <div className="mt-4 flex justify-end border-t border-border pt-3">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Закрити
            </Button>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
