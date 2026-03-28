"use client";

import type { ReactNode } from "react";

import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export function ListPageToolbar({
  queryInput,
  onQueryChange,
  searchPlaceholder,
  className,
  filters,
}: {
  queryInput: string;
  onQueryChange: (value: string) => void;
  searchPlaceholder: string;
  className?: string;
  filters?: ReactNode;
}) {
  return (
    <Card className={cn("p-3", className)}>
      <div className="flex flex-col gap-3">
        <Input
          value={queryInput}
          placeholder={searchPlaceholder}
          className="w-full md:max-w-md"
          onChange={(e) => onQueryChange(e.currentTarget.value)}
        />
        {filters ? <div className="border-t border-border pt-3">{filters}</div> : null}
      </div>
    </Card>
  );
}
