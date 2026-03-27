import { cn } from "@/lib/utils";

/** CRM table header background (matches list pages). */
export const listTableHeaderClass =
  "bg-crm-table-header text-left text-sm font-semibold text-foreground/90";

/** Icon-only action control for table rows (info, edit links). */
export const tableActionIconClassName = cn(
  "inline-flex h-8 w-8 items-center justify-center rounded-md border border-border text-foreground/80 hover:bg-accent",
);
