"use client";

import { Tabs } from "@base-ui/react/tabs";
import { BookMarked, FileStack, Flame, Package, Users } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/** Matches `ContractEditForm` outer `<form className="… rounded-xl border bg-white p-4">` + segment control. */
const tabListClass = cn(
  "w-full min-w-0 rounded-lg border border-zinc-200 bg-zinc-50/80 p-1 dark:border-border dark:bg-muted/40",
  /* Below md: vertical list. md and up: one horizontal row + scroll if needed. */
  "flex flex-col gap-1 md:flex-row md:flex-nowrap md:gap-1 md:overflow-x-auto md:[scrollbar-width:thin]",
);

const tabBaseClass =
  "flex min-h-8 min-w-0 w-full items-center justify-center gap-2 rounded-md px-3 py-1.5 text-center text-sm font-medium whitespace-normal transition-[color,box-shadow,background-color] outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background md:inline-flex md:w-auto md:shrink-0 md:text-left md:whitespace-nowrap [&_svg]:size-4 [&_svg]:shrink-0";

/** Use Base UI `className` callback so active styling does not depend on Tailwind `aria-*` variant generation. */
function tabTriggerClassName(state: { active: boolean }) {
  return cn(
    tabBaseClass,
    state.active
      ? "bg-primary font-semibold text-primary-foreground shadow-sm hover:bg-primary hover:text-primary-foreground"
      : "text-zinc-600 hover:bg-zinc-100/90 hover:text-zinc-900 dark:text-muted-foreground dark:hover:bg-muted/70 dark:hover:text-foreground",
  );
}

export function AttestationSettingsTabs(props: {
  commission: ReactNode;
  regulatory: ReactNode;
  samples: ReactNode;
  consumables: ReactNode;
  templates: ReactNode;
}) {
  return (
    <Tabs.Root
      defaultValue="commission"
      className="flex w-full min-w-0 max-w-full flex-col gap-4 rounded-xl border bg-white p-4 dark:bg-card"
    >
      <Tabs.List className={tabListClass}>
        <Tabs.Tab value="commission" className={tabTriggerClassName}>
          <Users aria-hidden />
          Члени комісії
        </Tabs.Tab>
        <Tabs.Tab value="regulatory" className={tabTriggerClassName}>
          <BookMarked aria-hidden />
          Нормативні документи
        </Tabs.Tab>
        <Tabs.Tab value="samples" className={tabTriggerClassName}>
          <Package aria-hidden />
          Матеріали зразків
        </Tabs.Tab>
        <Tabs.Tab value="consumables" className={tabTriggerClassName}>
          <Flame aria-hidden />
          Зварювальні матеріали
        </Tabs.Tab>
        <Tabs.Tab value="templates" className={tabTriggerClassName}>
          <FileStack aria-hidden />
          Шаблони документів
        </Tabs.Tab>
      </Tabs.List>

      <Tabs.Panel value="commission" className="flex flex-col gap-3 outline-none">
        {props.commission}
      </Tabs.Panel>
      <Tabs.Panel value="regulatory" className="flex flex-col gap-3 outline-none">
        {props.regulatory}
      </Tabs.Panel>
      <Tabs.Panel value="samples" className="flex flex-col gap-3 outline-none">
        {props.samples}
      </Tabs.Panel>
      <Tabs.Panel value="consumables" className="flex flex-col gap-3 outline-none">
        {props.consumables}
      </Tabs.Panel>
      <Tabs.Panel value="templates" className="flex flex-col gap-3 outline-none">
        {props.templates}
      </Tabs.Panel>
    </Tabs.Root>
  );
}
