"use client";

import { BarChart3, Pencil, UserPlus } from "lucide-react";
import Link from "next/link";

import { tableActionIconClassName } from "@/components/data-table/list-styles";
import { cn } from "@/lib/utils";

const iconPrimaryClassName = cn(
  "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-transparent bg-primary text-primary-foreground shadow-sm transition-colors hover:bg-[var(--primary-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
);

export function AttestationGroupRowActions({
  groupId,
  status,
}: {
  groupId: string;
  status: string;
}) {
  const canMutate = status === "draft" || status === "active";

  return (
    <div className="flex flex-nowrap items-center justify-end gap-1">
      <a
        className={tableActionIconClassName}
        href={`/api/attestation/documents/report?groupId=${groupId}`}
        title="Згенерувати звіт"
        aria-label="Згенерувати звіт по групі"
      >
        <BarChart3 className="size-4 shrink-0" aria-hidden />
      </a>
      {canMutate ? (
        <Link
          className={tableActionIconClassName}
          href={`/attestation/groups/${groupId}/edit`}
          title="Редагувати групу"
          aria-label="Редагувати групу"
        >
          <Pencil className="size-4 shrink-0" aria-hidden />
        </Link>
      ) : null}
      {canMutate ? (
        <Link
          className={iconPrimaryClassName}
          href={`/attestation/welders/new?groupId=${groupId}`}
          title="Додати зварника"
          aria-label="Додати зварника в групу"
        >
          <UserPlus className="size-4 shrink-0" aria-hidden />
        </Link>
      ) : null}
    </div>
  );
}
