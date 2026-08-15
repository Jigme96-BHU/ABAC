/** Generic client-side CSV export — extracted from the admin Volunteers tab
 *  (the first admin dashboard to need this), so Members and Corporate can
 *  reuse the exact same download UX without duplicating it. */
export type CsvColumn<T> = { header: string; value: (row: T) => string };

function csvCell(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}

export function buildCsv<T>(rows: T[], columns: CsvColumn<T>[]): string {
  return [
    columns.map((c) => csvCell(c.header)).join(","),
    ...rows.map((row) => columns.map((c) => csvCell(c.value(row))).join(",")),
  ].join("\n");
}

/** Triggers a browser download of `rows` as a CSV file named `filenamePrefix-YYYY-MM-DD.csv`. */
export function downloadCsv<T>(rows: T[], columns: CsvColumn<T>[], filenamePrefix: string) {
  const csv = buildCsv(rows, columns);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${filenamePrefix}-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
