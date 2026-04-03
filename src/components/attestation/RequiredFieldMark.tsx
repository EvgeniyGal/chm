import { cn } from "@/lib/utils";

/** Червона зірочка для підписів обовʼязкових полів. */
export function RequiredFieldMark({ className }: { className?: string }) {
  return (
    <span className={cn("text-destructive", className)} aria-hidden="true">
      *
    </span>
  );
}
