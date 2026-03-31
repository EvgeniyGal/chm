type XlsxColumn = {
  header: string;
  key: string;
  type?: "string" | "number";
  width?: number;
};

export async function exportRowsToXlsx(
  rows: Array<Record<string, string | number | null | undefined>>,
  columns: XlsxColumn[],
  fileName: string,
  sheetName: string,
): Promise<void> {
  const XLSX = await import("xlsx");

  const table = [
    columns.map((c) => c.header),
    ...rows.map((row) =>
      columns.map((col) => {
        const value = row[col.key];
        if (col.type === "number") {
          if (typeof value === "number" && Number.isFinite(value)) return value;
          if (typeof value === "string") {
            const parsed = Number.parseFloat(value.replace(/\s/g, "").replace(",", "."));
            return Number.isFinite(parsed) ? parsed : 0;
          }
          return 0;
        }
        return value == null ? "" : String(value);
      }),
    ),
  ];

  const worksheet = XLSX.utils.aoa_to_sheet(table);
  worksheet["!cols"] = columns.map((c) => ({ wch: c.width ?? 18 }));

  for (let c = 0; c < columns.length; c += 1) {
    if (columns[c]?.type !== "number") continue;
    for (let r = 1; r < table.length; r += 1) {
      const cellRef = XLSX.utils.encode_cell({ r, c });
      const cell = worksheet[cellRef];
      if (!cell) continue;
      cell.t = "n";
      cell.z = "#,##0.00";
    }
  }

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  XLSX.writeFile(workbook, fileName);
}
