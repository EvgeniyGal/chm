"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import {
  addWeldingConsumableAndReturnId,
  updateWeldingConsumableAction,
} from "@/lib/attestation/welding-consumables-actions";
import { WELDING_COATING_TYPES, type WeldingCoatingType } from "@/lib/attestation/welding-consumable-coating-options";
import { getServerActionErrorMessage } from "@/lib/server-action-error-message";

export type WeldingConsumableEditTarget = { id: string; materialGrade: string; coatingType: string };

function labelFor(materialGrade: string, coatingType: string) {
  return `${coatingType} (${materialGrade})`;
}

export function QuickCreateWeldingConsumableModal({
  open,
  onOpenChange,
  editTarget,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (next: boolean) => void;
  editTarget: WeldingConsumableEditTarget | null;
  onSuccess: (row: { id: string; label: string; materialGrade: string; coatingType: string }) => void;
}) {
  const [materialGrade, setMaterialGrade] = useState("");
  const [coatingType, setCoatingType] = useState<WeldingCoatingType>("A");
  const [submitting, setSubmitting] = useState(false);

  const isEdit = editTarget != null;

  useEffect(() => {
    if (!open) return;
    if (editTarget) {
      setMaterialGrade(editTarget.materialGrade);
      const c = editTarget.coatingType as WeldingCoatingType;
      setCoatingType(WELDING_COATING_TYPES.includes(c) ? c : "A");
    } else {
      setMaterialGrade("");
      setCoatingType("A");
    }
  }, [open, editTarget]);

  async function submit() {
    const grade = materialGrade.trim();
    if (!grade) {
      toast.error("Вкажіть марку матеріалу");
      return;
    }
    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.set("materialGrade", grade);
      fd.set("coatingType", coatingType);
      const lbl = labelFor(grade, coatingType);

      if (isEdit && editTarget) {
        fd.set("id", editTarget.id);
        await updateWeldingConsumableAction(fd);
        toast.success("Зміни збережено.");
        onSuccess({ id: editTarget.id, label: lbl, materialGrade: grade, coatingType });
      } else {
        const id = await addWeldingConsumableAndReturnId(fd);
        toast.success("Витратний матеріал додано.");
        onSuccess({ id, label: lbl, materialGrade: grade, coatingType });
      }
      onOpenChange(false);
    } catch (e) {
      toast.error(getServerActionErrorMessage(e));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogTitle>{isEdit ? "Редагування електрода / дроту" : "Новий електрод / дріт"}</DialogTitle>
        <div className="grid grid-cols-1 gap-3">
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-muted-foreground">Марка матеріалу</span>
            <input
              value={materialGrade}
              onChange={(e) => setMaterialGrade(e.target.value)}
              className="h-10 rounded-md border border-border bg-white px-3 text-sm dark:bg-background"
              placeholder="Напр. СВ08Г2С"
              autoComplete="off"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-muted-foreground">Тип покриття</span>
            <select
              value={coatingType}
              onChange={(e) => setCoatingType(e.target.value as WeldingCoatingType)}
              className="h-10 rounded-md border border-border bg-white px-3 text-sm dark:bg-background"
            >
              {WELDING_COATING_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-end">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Скасувати
          </Button>
          <Button type="button" onClick={() => void submit()} disabled={submitting}>
            {submitting ? "Збереження…" : isEdit ? "Зберегти" : "Додати"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
