import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function EmptyListState({ message, className }: { message: string; className?: string }) {
  return (
    <Card className={cn("overflow-hidden p-8 text-center text-sm text-muted-foreground", className)}>{message}</Card>
  );
}
