"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { useCallback, useEffect, useRef, useState, type ChangeEvent } from "react";
import { FiTrash2 } from "react-icons/fi";
import { toast } from "sonner";

import { FileDropZone } from "@/components/uploads/FileDropZone";
import { getServerActionErrorMessage } from "@/lib/server-action-error-message";
import type { SignedScanListItem } from "@/lib/signed-scans";

const ACCEPT_ATTR =
  "application/pdf,.pdf,image/jpeg,image/png,image/gif,image/webp,image/bmp,image/tiff,image/x-ms-bmp,.tif,.tiff,.heic,.heif";

const entityLabels: Record<"CONTRACT" | "INVOICE" | "ACCEPTANCE_ACT", string> = {
  CONTRACT: "документа (договір)",
  INVOICE: "документа (рахунок)",
  ACCEPTANCE_ACT: "документа (акт)",
};

export function SignedUpload({
  entityType,
  entityId,
  initialScans,
}: {
  entityType: "CONTRACT" | "INVOICE" | "ACCEPTANCE_ACT";
  entityId: string;
  /** Optional SSR list to avoid empty flash on first paint. */
  initialScans?: SignedScanListItem[];
}) {
  const [busy, setBusy] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<{ id: string; label: string } | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [scans, setScans] = useState<SignedScanListItem[]>(() => initialScans ?? []);
  const [listLoading, setListLoading] = useState(() => initialScans === undefined);
  const fileRef = useRef<HTMLInputElement>(null);
  const [pickedFiles, setPickedFiles] = useState<File[]>([]);
  const docPhrase = entityLabels[entityType];

  const syncPickedFromInput = useCallback(() => {
    setPickedFiles(Array.from(fileRef.current?.files ?? []));
  }, []);

  const clearPicked = useCallback(() => {
    const input = fileRef.current;
    if (input) input.value = "";
    setPickedFiles([]);
  }, []);

  const handleFileInputChange = useCallback(
    (_e: ChangeEvent<HTMLInputElement>) => {
      syncPickedFromInput();
    },
    [syncPickedFromInput],
  );

  const loadScans = useCallback(async () => {
    setListLoading(true);
    try {
      const res = await fetch(`/api/uploads/signed?entityType=${entityType}&entityId=${entityId}`, {
        cache: "no-store",
      });
      const data = (await res.json().catch(() => null)) as { data?: SignedScanListItem[]; error?: string } | null;
      if (!res.ok) throw new Error(data?.error ?? "LIST_FAILED");
      setScans(data?.data ?? []);
    } catch {
      setScans([]);
    } finally {
      setListLoading(false);
    }
  }, [entityId, entityType]);

  useEffect(() => {
    if (initialScans !== undefined) {
      setScans(initialScans);
      setListLoading(false);
      return;
    }
    void loadScans();
  }, [entityId, entityType, initialScans, loadScans]);

  const upload = useCallback(async () => {
    setMsg(null);
    const input = fileRef.current;
    const files = Array.from(input?.files ?? []);
    if (files.length === 0) {
      const m = "Оберіть один або кілька файлів.";
      setMsg(m);
      toast.error(m);
      return;
    }
    setBusy(true);
    try {
      let ok = 0;
      const failures: string[] = [];

      for (const file of files) {
        const fd = new FormData();
        fd.set("file", file);
        const res = await fetch(`/api/uploads/signed?entityType=${entityType}&entityId=${entityId}`, {
          method: "POST",
          body: fd,
        });
        const data = (await res.json().catch(() => null)) as { error?: string; hint?: string; maxMb?: number } | null;
        if (!res.ok) {
          const parts = [data?.error ?? "UPLOAD_FAILED"];
          if (data?.hint) parts.push(data.hint);
          if (typeof data?.maxMb === "number") parts.push(`Макс. ${data.maxMb} МБ.`);
          failures.push(`${file.name}: ${parts.filter(Boolean).join(" ")}`);
          continue;
        }
        ok += 1;
      }

      if (input) input.value = "";
      setPickedFiles([]);
      await loadScans();

      if (failures.length === 0) {
        setMsg(ok === 1 ? "Завантажено 1 файл." : `Завантажено файлів: ${ok}.`);
        toast.success(ok === 1 ? "Файл збережено в сховищі." : `Завантажено файлів: ${ok}.`);
      } else if (ok > 0) {
        const summary = `Завантажено ${ok} з ${files.length}. Помилки:\n${failures.join("\n")}`;
        setMsg(summary);
        toast.error(`Завантажено лише ${ok} з ${files.length}. Перевірте повідомлення нижче.`);
      } else {
        const summary = failures.join("\n");
        setMsg(summary);
        toast.error(getServerActionErrorMessage(new Error(failures[0] ?? "UPLOAD_FAILED")));
      }
    } catch (err: unknown) {
      const m = err instanceof Error ? err.message : "Помилка завантаження.";
      setMsg(m);
      toast.error(getServerActionErrorMessage(err instanceof Error ? err : new Error(m)));
    } finally {
      setBusy(false);
    }
  }, [entityId, entityType, loadScans]);

  const confirmDelete = useCallback(async () => {
    if (!pendingDelete) return;
    const scanId = pendingDelete.id;
    setDeletingId(scanId);
    try {
      const res = await fetch(`/api/uploads/signed/${scanId}`, { method: "DELETE" });
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) throw new Error(data?.error ?? "DELETE_FAILED");
      toast.success("Файл видалено.");
      setPendingDelete(null);
      await loadScans();
    } catch (err: unknown) {
      const m = err instanceof Error ? err.message : "Не вдалося видалити.";
      toast.error(getServerActionErrorMessage(err instanceof Error ? err : new Error(m)));
    } finally {
      setDeletingId(null);
    }
  }, [loadScans, pendingDelete]);

  return (
    <div className="rounded-xl border bg-white p-4">
      <div className="text-sm font-semibold text-foreground">Скан підписаного {docPhrase} — хмарне сховище</div>

      <div className="mt-3 border-t border-border pt-3">
        <div className="text-xs font-medium text-foreground/90">Завантажені файли</div>
        {listLoading ? (
          <p className="mt-1 text-xs text-muted-foreground">Завантаження списку…</p>
        ) : scans.length === 0 ? (
          <p className="mt-1 text-xs text-muted-foreground">Поки що немає завантажених сканів.</p>
        ) : (
          <ul className="mt-2 flex flex-col gap-1.5">
            {scans.map((s, idx) => {
              const label =
                s.originalFilename?.trim() ||
                (s.contentType === "application/pdf" ? `Скан ${idx + 1} (PDF)` : `Скан ${idx + 1} (WebP)`);
              return (
                <li key={s.id} className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <a
                    href={`/api/uploads/signed/${s.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-primary underline-offset-2 hover:underline"
                  >
                    {label}
                  </a>
                  <span className="text-xs tabular-nums text-muted-foreground">
                    {new Date(s.createdAt).toLocaleString("uk-UA")}
                  </span>
                  <button
                    type="button"
                    disabled={deletingId === s.id}
                    className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-50"
                    aria-label={`Видалити файл: ${label}`}
                    title="Видалити файл"
                    onClick={() => setPendingDelete({ id: s.id, label })}
                  >
                    <FiTrash2 className="size-4" aria-hidden="true" />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="mt-3 flex flex-col gap-3 border-t border-border pt-3">
        <FileDropZone
          inputId="signed-scan-files"
          labelId="signed-scan-label"
          label="Файли для завантаження"
          accept={ACCEPT_ATTR}
          multiple
          inputRef={fileRef}
          emptyTitle="Перетягніть файли сюди або натисніть, щоб обрати"
          footerHint="Перетягніть файли у рамку або натисніть на неї — можна обрати кілька."
          dragActiveTitle="Відпустіть файли тут"
          selectedContent={
            pickedFiles.length === 0 ? null : pickedFiles.length === 1 ? (
              <span className="max-w-full break-all text-sm font-medium text-foreground">{pickedFiles[0].name}</span>
            ) : (
              <span className="text-sm font-medium text-foreground">
                {pickedFiles.length} файл(ів): {pickedFiles.map((f) => f.name).join(", ")}
              </span>
            )
          }
          onInputChange={handleFileInputChange}
          onClear={clearPicked}
        />
        <button type="button" disabled={busy} className="crm-btn-primary w-fit disabled:opacity-50" onClick={upload}>
          {busy ? "Завантаження…" : "Додати файли у хмару"}
        </button>
        {msg ? <div className="whitespace-pre-wrap text-sm text-zinc-700">{msg}</div> : null}
      </div>

      <Dialog.Root open={pendingDelete !== null} onOpenChange={(open) => !open && setPendingDelete(null)}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/40" />
          <Dialog.Content className="fixed left-1/2 top-1/2 w-[min(420px,calc(100vw-24px))] -translate-x-1/2 -translate-y-1/2 rounded-xl bg-white p-4 shadow-lg">
            <Dialog.Title className="text-sm font-semibold text-foreground">Підтвердження видалення</Dialog.Title>
            <Dialog.Description className="mt-2 text-sm text-zinc-700">
              {pendingDelete ? (
                <>
                  Видалити файл «{pendingDelete.label}» зі сховища? Цю дію не можна скасувати.
                </>
              ) : null}
            </Dialog.Description>
            <div className="mt-4 flex justify-end gap-2">
              <Dialog.Close asChild>
                <button type="button" className="h-9 rounded-md border px-3 text-sm hover:bg-zinc-50" disabled={!!deletingId}>
                  Скасувати
                </button>
              </Dialog.Close>
              <button
                type="button"
                disabled={!!deletingId}
                className="h-9 rounded-md bg-red-600 px-3 text-sm text-white hover:bg-red-700 disabled:opacity-50"
                onClick={() => void confirmDelete()}
              >
                {deletingId ? "Видалення…" : "Видалити"}
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}
