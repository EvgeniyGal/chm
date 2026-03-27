import * as React from "react";

import { cn } from "@/lib/utils";

/** Native select element styled to match Input. */
function NativeSelect({ className, ...props }: React.ComponentProps<"select">) {
  return (
    <select
      data-slot="native-select"
      className={cn(
        "flex h-9 min-w-0 cursor-pointer rounded-md border border-input bg-card px-2 text-sm text-foreground shadow-xs outline-none transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}

export { NativeSelect };
