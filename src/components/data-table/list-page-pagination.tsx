"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { cn } from "@/lib/utils";

const PAGE_SIZE_OPTIONS = [25, 50, 100] as const;

export function ListPagePagination({
  page,
  totalPages,
  total,
  onPrev,
  onNext,
  pageSize,
  onPageSizeChange,
  pageSizeOptions = PAGE_SIZE_OPTIONS,
  className,
}: {
  page: number;
  totalPages: number;
  total: number;
  onPrev: () => void;
  onNext: () => void;
  pageSize?: number;
  onPageSizeChange?: (next: number) => void;
  pageSizeOptions?: readonly number[];
  className?: string;
}) {
  const showPageSize = pageSize != null && onPageSizeChange != null;

  return (
    <Card
      className={cn(
        "flex flex-col gap-3 px-3 py-2 text-sm sm:flex-row sm:items-center sm:justify-between",
        className,
      )}
    >
      <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-4 sm:gap-y-2">
        <span className="text-muted-foreground">
          Сторінка {page} з {totalPages} (всього: {total})
        </span>
        {showPageSize ? (
          <div className="flex items-center gap-2">
            <Label className="shrink-0 text-muted-foreground">На сторінці:</Label>
            <NativeSelect
              value={String(pageSize)}
              onChange={(e) => onPageSizeChange(Number.parseInt(e.currentTarget.value, 10))}
            >
              {pageSizeOptions.map((n) => (
                <option key={n} value={String(n)}>
                  {n}
                </option>
              ))}
            </NativeSelect>
          </div>
        ) : null}
      </div>
      <div className="flex shrink-0 gap-2">
        <Button type="button" variant="outline" size="lg" disabled={page <= 1} onClick={onPrev}>
          Назад
        </Button>
        <Button type="button" variant="outline" size="lg" disabled={page >= totalPages} onClick={onNext}>
          Далі
        </Button>
      </div>
    </Card>
  );
}
