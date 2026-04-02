"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { addSampleMaterialAndReturnId, updateSampleMaterialAction } from "@/lib/attestation/sample-materials-actions";
import { getServerActionErrorMessage } from "@/lib/server-action-error-message";

const GROUP_OPTIONS = ["W01", "W02", "W03", "W04", "W11"] as const;

export type SampleMaterialEditTarget = { id: string; groupCode: string; steelGrade: string };

export function QuickCreateSampleMaterialModal({
  open,
  onOpenChange,
  editTarget,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (next: boolean) => void;
  /** Якщо задано — редагування існуючого запису; інакше — створення. */
  editTarget: SampleMaterialEditTarget | null;
  onSuccess: (row: { id: string; label: string; groupCode: string; steelGrade: string }) => void;
}) {
  const [groupCode, setGroupCode] = useState<(typeof GROUP_OPTIONS)[number]>("W01");
  const [steelGrade, setSteelGrade] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const isEdit = editTarget != null;

  useEffect(() => {
    if (!open) return;
    if (editTarget) {
      const g = editTarget.groupCode as (typeof GROUP_OPTIONS)[number];
      setGroupCode(GROUP_OPTIONS.includes(g) ? g : "W01");
      setSteelGrade(editTarget.steelGrade);
    } else {
      setGroupCode("W01");
      setSteelGrade("");
    }
  }, [open, editTarget]);

  async function submit() {
    const steel = steelGrade.trim();
    if (!steel) {
      toast.error("Вкажіть марку сталі");
      return;
    }
    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.set("groupCode", groupCode);
      fd.set("steelGrade", steel);

      const label = `${groupCode} — ${steel}`;
      if (isEdit && editTarget) {
        fd.set("id", editTarget.id);
        await updateSampleMaterialAction(fd);
        toast.success("Зміни збережено.");
        onSuccess({ id: editTarget.id, label, groupCode, steelGrade: steel });
      } else {
        const id = await addSampleMaterialAndReturnId(fd);
        toast.success("Матеріал зразка додано.");
        onSuccess({ id, label, groupCode, steelGrade: steel });
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
        <DialogTitle>{isEdit ? "Редагування матеріалу зразка" : "Новий матеріал зразка"}</DialogTitle>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-muted-foreground">Група</span>
            <select
              value={groupCode}
              onChange={(e) => setGroupCode(e.target.value as (typeof GROUP_OPTIONS)[number])}
              className="h-10 rounded-md border border-border bg-white px-3 text-sm dark:bg-background"
            >
              {GROUP_OPTIONS.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm sm:col-span-2">
            <span className="text-muted-foreground">Марка сталі</span>
            <input
              value={steelGrade}
              onChange={(e) => setSteelGrade(e.target.value)}
              className="h-10 rounded-md border border-border bg-white px-3 text-sm dark:bg-background"
              placeholder="Напр. 09Г2С"
              autoComplete="off"
            />
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
