"use client";

import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { cn } from "@/lib/utils";

const PAGE_SIZE_OPTIONS = [25, 50, 100] as const;

export function ListPageToolbar({
  queryInput,
  onQueryChange,
  searchPlaceholder,
  pageSize,
  onPageSizeChange,
  pageSizeOptions = PAGE_SIZE_OPTIONS,
  className,
}: {
  queryInput: string;
  onQueryChange: (value: string) => void;
  searchPlaceholder: string;
  pageSize: number;
  onPageSizeChange: (next: number) => void;
  pageSizeOptions?: readonly number[];
  className?: string;
}) {
  return (
    <Card className={cn("p-3", className)}>
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <Input
          value={queryInput}
          placeholder={searchPlaceholder}
          className="md:max-w-md"
          onChange={(e) => onQueryChange(e.currentTarget.value)}
        />
        <div className="flex items-center gap-2 text-sm">
          <Label className="text-muted-foreground">На сторінці:</Label>
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
      </div>
    </Card>
  );
}
