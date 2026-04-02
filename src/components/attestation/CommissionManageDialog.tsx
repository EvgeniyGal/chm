"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { ArchiveCommissionConfirmDialog } from "@/components/attestation/ArchiveCommissionConfirmDialog";
import { CommissionRosterTable, type CommissionRosterRow } from "@/components/attestation/CommissionRosterTable";
import { GuardedForm } from "@/components/forms/GuardedForm";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import {
  addCommissionMemberAction,
  archiveCommissionMemberAction,
} from "@/lib/attestation/commission-roster-actions";
import { getServerActionErrorMessage } from "@/lib/server-action-error-message";

export type { CommissionRosterRow };

export function CommissionManageDialog({
  open,
  onOpenChange,
  rosterRows,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rosterRows: CommissionRosterRow[];
}) {
  const router = useRouter();
  const [pendingArchive, setPendingArchive] = useState<{ id: string; fullName: string } | null>(null);
  const [archiving, setArchiving] = useState(false);

  async function confirmArchive() {
    if (!pendingArchive) return;
    setArchiving(true);
    try {
      const fd = new FormData();
      fd.set("id", pendingArchive.id);
      await archiveCommissionMemberAction(fd);
      toast.success("Запис архівовано.");
      setPendingArchive(null);
      router.refresh();
    } catch (e) {
      toast.error(getServerActionErrorMessage(e));
    } finally {
      setArchiving(false);
    }
  }

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(next) => {
          if (!next) setPendingArchive(null);
          onOpenChange(next);
          router.refresh();
        }}
      >
        <DialogContent contentPosition="viewport" className="p-0 sm:max-w-lg">
          <div className="shrink-0 space-y-3 p-4 pb-2">
            <DialogTitle>Члени комісії</DialogTitle>

            <GuardedForm
              action={addCommissionMemberAction}
              className="flex flex-col gap-2 rounded-md border border-border p-3"
            >
              <div className="text-sm font-medium">Додати члена</div>
              <input name="fullName" required placeholder="ПІБ" className="h-10 rounded-md border border-border bg-white px-3 text-sm" />
              <input name="position" placeholder="Посада (для протоколу)" className="h-10 rounded-md border border-border bg-white px-3 text-sm" />
              <select name="role" className="h-10 rounded-md border border-border bg-white px-3 text-sm" defaultValue="member">
                <option value="member">Член комісії</option>
                <option value="head">Голова комісії</option>
              </select>
              <button type="submit" className="crm-btn-primary w-fit">
                Додати
              </button>
            </GuardedForm>
          </div>

          <div className="min-h-0 flex-1 basis-0 overflow-y-auto overscroll-contain px-4 pb-4">
            <CommissionRosterTable rosterRows={rosterRows} onRequestArchive={setPendingArchive} />
          </div>
        </DialogContent>
      </Dialog>

      <ArchiveCommissionConfirmDialog
        open={pendingArchive !== null}
        onOpenChange={(next) => !next && setPendingArchive(null)}
        fullName={pendingArchive?.fullName ?? ""}
        archiving={archiving}
        onConfirm={confirmArchive}
      />
    </>
  );
}
