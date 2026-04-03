"use client";

import { Award, FileText } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { getServerActionErrorMessage } from "@/lib/server-action-error-message";
import { isNextNavigationError } from "@/lib/is-next-navigation-error";

function filenameFromContentDisposition(cd: string | null): string | null {
  if (!cd) return null;
  const star = /filename\*=UTF-8''([^;]+)/i.exec(cd);
  if (star) {
    try {
      return decodeURIComponent(star[1].trim());
    } catch {
      return null;
    }
  }
  const q = /filename="([^"]+)"/i.exec(cd);
  return q ? q[1] : null;
}

/**
 * Зберігає форму (`_skipRedirect`), потім завантажує .docx з API.
 * Для **нового** запису після першого успішного збереження переходить на сторінку редагування (щоб не створювати дублікат).
 */
export function WelderAttestationDocumentButtons({
  formId,
  saveWelder,
  onSaved,
  fixedWelderId,
  navigateToEditAfterCreate,
}: {
  formId: string;
  saveWelder: (fd: FormData) => Promise<void | { welderId: string }>;
  onSaved: () => void;
  /** Для редагування — id з БД; для нового запису не передавати. */
  fixedWelderId?: string;
  /** Після створення запису та завантаження — `router.replace` на `/welders/[id]/edit`. */
  navigateToEditAfterCreate?: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<null | "protocol" | "certificate">(null);

  async function saveThenDownload(kind: "protocol" | "certificate") {
    const form = document.getElementById(formId) as HTMLFormElement | null;
    if (!form) {
      toast.error("Форму не знайдено.");
      return;
    }
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }
    setBusy(kind);
    try {
      const fd = new FormData(form);
      fd.set("_skipRedirect", "1");
      const result = await saveWelder(fd);
      onSaved();

      let welderId = fixedWelderId;
      if (!welderId && result && typeof result === "object" && "welderId" in result) {
        welderId = (result as { welderId: string }).welderId;
      }
      if (!welderId) {
        toast.error("Не вдалося отримати ідентифікатор запису для документа.");
        return;
      }

      const shouldNavigateAfterCreate =
        Boolean(navigateToEditAfterCreate && !fixedWelderId && result && typeof result === "object" && "welderId" in result);

      const path =
        kind === "protocol"
          ? `/api/attestation/documents/protocol?welderId=${encodeURIComponent(welderId)}`
          : `/api/attestation/documents/certificate?welderId=${encodeURIComponent(welderId)}`;
      const res = await fetch(path);
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string; hint?: string } | null;
        toast.error(
          data?.hint ??
            data?.error ??
            "Не вдалося згенерувати документ. Перевірте активні шаблони в Атестація → Налаштування.",
        );
        if (shouldNavigateAfterCreate) {
          router.replace(`/attestation/welders/${welderId}/edit`);
        }
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const cd = res.headers.get("content-disposition");
      a.download =
        filenameFromContentDisposition(cd) ?? (kind === "protocol" ? "protocol.docx" : "certificate.docx");
      a.rel = "noopener";
      a.click();
      URL.revokeObjectURL(url);
      toast.success(kind === "protocol" ? "Протокол завантажено." : "Посвідчення завантажено.");

      if (shouldNavigateAfterCreate) {
        router.replace(`/attestation/welders/${welderId}/edit`);
      }
    } catch (e) {
      if (isNextNavigationError(e)) return;
      toast.error(getServerActionErrorMessage(e instanceof Error ? e : new Error("SAVE_FAILED")));
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
      <button
        type="button"
        disabled={busy !== null}
        className="crm-btn-outline inline-flex h-10 items-center justify-center gap-2 px-4"
        onClick={() => void saveThenDownload("protocol")}
      >
        <FileText className="size-4 shrink-0" aria-hidden />
        {busy === "protocol" ? "Збереження…" : "Протокол (.docx)"}
      </button>
      <button
        type="button"
        disabled={busy !== null}
        className="crm-btn-outline inline-flex h-10 items-center justify-center gap-2 px-4"
        onClick={() => void saveThenDownload("certificate")}
      >
        <Award className="size-4 shrink-0" aria-hidden />
        {busy === "certificate" ? "Збереження…" : "Посвідчення (.docx)"}
      </button>
    </div>
  );
}
