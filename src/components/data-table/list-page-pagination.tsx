"use client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function ListPagePagination({
  page,
  totalPages,
  total,
  onPrev,
  onNext,
  className,
}: {
  page: number;
  totalPages: number;
  total: number;
  onPrev: () => void;
  onNext: () => void;
  className?: string;
}) {
  return (
    <Card className={cn("flex items-center justify-between px-3 py-2 text-sm", className)}>
      <span className="text-muted-foreground">
        Сторінка {page} з {totalPages} (всього: {total})
      </span>
      <div className="flex gap-2">
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
