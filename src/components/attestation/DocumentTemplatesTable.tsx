"use client";

import { useMemo } from "react";
import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";

import { TemplateRowActions } from "@/components/attestation/TemplateRowActions";
import { TemplateActivateButton } from "@/components/attestation/TemplateUploadForm";
import { listTableHeaderClass } from "@/components/data-table/list-styles";

export type DocumentTemplateRow = {
  id: string;
  templateType: string;
  name: string;
  isActive: boolean;
};

const TEMPLATE_TYPE_LABEL: Record<string, string> = {
  protocol: "Протокол засідання",
  certificate: "Посвідчення зварника",
  report_protocol: "Протокол звітний",
};

function typeLabel(type: string) {
  return TEMPLATE_TYPE_LABEL[type] ?? type;
}

export function DocumentTemplatesTable({ rows }: { rows: DocumentTemplateRow[] }) {
  const columns = useMemo<ColumnDef<DocumentTemplateRow>[]>(
    () => [
      {
        accessorKey: "templateType",
        header: "Тип",
        cell: ({ row }) => <span className="font-medium">{typeLabel(row.original.templateType)}</span>,
      },
      {
        id: "name",
        header: "Назва",
        cell: ({ row }) => (
          <TemplateRowActions templateId={row.original.id} initialName={row.original.name} isActive={row.original.isActive} />
        ),
      },
      {
        id: "active",
        accessorFn: (r) => (r.isActive ? "так" : "ні"),
        header: "Активний",
        cell: ({ row }) => <span>{row.original.isActive ? "так" : "ні"}</span>,
      },
      {
        id: "activate",
        header: () => <span className="sr-only">Активація</span>,
        cell: ({ row }) =>
          !row.original.isActive ? (
            <TemplateActivateButton templateId={row.original.id} />
          ) : (
            <span className="text-muted-foreground">—</span>
          ),
      },
    ],
    [],
  );

  const table = useReactTable({
    data: rows,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  if (rows.length === 0) {
    return (
      <p className="rounded-md border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
        Шаблонів ще немає. Завантажте .docx вище.
      </p>
    );
  }

  return (
    <>
      <div className="hidden md:block">
        <div className="overflow-x-auto rounded-md border border-border">
          <table className="w-full min-w-[640px] border-collapse text-sm">
            <thead className={listTableHeaderClass}>
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <th key={header.id} className="px-2 py-2 text-left">
                      {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {table.getRowModel().rows.map((row) => (
                <tr key={row.original.id} className="border-b border-border">
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-2 py-2 align-top">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid gap-3 md:hidden">
        {table.getRowModel().rows.map((row) => {
          const t = row.original;
          return (
            <div
              key={t.id}
              className="rounded-lg border border-border bg-card px-3 py-3 text-card-foreground shadow-sm"
            >
              <div className="mb-2 text-base font-semibold leading-tight">{typeLabel(t.templateType)}</div>
              <dl className="mb-3 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-sm">
                <dt className="text-muted-foreground">Активний</dt>
                <dd>{t.isActive ? "так" : "ні"}</dd>
              </dl>
              <div className="space-y-3 border-t border-border pt-3">
                <TemplateRowActions templateId={t.id} initialName={t.name} isActive={t.isActive} />
                {!t.isActive ? (
                  <div>
                    <TemplateActivateButton templateId={t.id} />
                  </div>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
