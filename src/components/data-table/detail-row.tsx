import { cn } from "@/lib/utils";

export function DetailRow({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <div className={cn("grid grid-cols-3 gap-3", className)}>
      <div className="text-muted-foreground">{label}</div>
      <div className="col-span-2 text-foreground">{value}</div>
    </div>
  );
}
