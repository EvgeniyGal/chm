import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function ListPageSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-end justify-between gap-3">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-10 w-36 rounded-lg" />
      </div>

      <Card className="p-3">
        <Skeleton className="h-10 w-full max-w-md rounded-lg" />
        <div className="mt-3 border-t border-border pt-3">
          <div className="flex flex-wrap gap-3">
            <Skeleton className="h-9 w-32 rounded-lg" />
            <Skeleton className="h-9 w-32 rounded-lg" />
            <Skeleton className="h-9 w-28 rounded-lg" />
          </div>
        </div>
      </Card>

      <Card className="overflow-hidden p-0">
        <div className="border-b border-border px-3 py-3">
          <div className="flex gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-4 w-20" />
            ))}
          </div>
        </div>
        {Array.from({ length: 8 }).map((_, row) => (
          <div key={row} className="flex gap-4 border-b border-border px-3 py-3 last:border-b-0">
            {Array.from({ length: 6 }).map((_, col) => (
              <Skeleton key={col} className="h-4 w-full max-w-[120px]" />
            ))}
          </div>
        ))}
      </Card>

      <div className="flex items-center justify-between gap-3">
        <Skeleton className="h-4 w-40" />
        <div className="flex gap-2">
          <Skeleton className="h-9 w-24 rounded-lg" />
          <Skeleton className="h-9 w-24 rounded-lg" />
        </div>
      </div>
    </div>
  );
}

export function FormPageSkeleton({ fields = 6 }: { fields?: number }) {
  return (
    <div className="w-full">
      <Skeleton className="mb-4 h-8 w-56" />
      <div className="grid grid-cols-1 gap-4 rounded-xl border bg-card p-4">
        {Array.from({ length: fields }).map((_, i) => (
          <div key={i} className="flex flex-col gap-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-10 w-full rounded-lg" />
          </div>
        ))}
        <div className="mt-2 flex gap-3">
          <Skeleton className="h-10 w-28 rounded-lg" />
          <Skeleton className="h-10 w-40 rounded-lg" />
        </div>
      </div>
    </div>
  );
}

export function DetailPageSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <Skeleton className="h-8 w-64" />
        <div className="flex gap-2">
          <Skeleton className="h-10 w-28 rounded-lg" />
          <Skeleton className="h-10 w-32 rounded-lg" />
        </div>
      </div>
      <FormPageSkeleton fields={4} />
    </div>
  );
}
