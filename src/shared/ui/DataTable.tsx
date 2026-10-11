import type { ReactNode } from "react";

export interface Column<Row> {
  header: string;
  cell(row: Row): ReactNode;
}

interface DataTableProps<Row> {
  caption: string;
  columns: Array<Column<Row>>;
  rows: Row[];
  getKey(row: Row): string;
  emptyText: string;
}

export function DataTable<Row>({ caption, columns, rows, getKey, emptyText }: DataTableProps<Row>) {
  if (rows.length === 0) {
    return <p className="rounded-2xl border border-dashed border-line bg-surface/60 p-6 text-sm text-muted">{emptyText}</p>;
  }
  return (
    <div className="overflow-x-auto rounded-2xl border border-line bg-surface shadow-card">
      <table className="w-full text-left text-sm">
        <caption className="sr-only">{caption}</caption>
        <thead className="border-b border-line bg-surface-muted text-xs font-semibold text-muted">
          <tr>
            {columns.map((column) => (
              <th key={column.header} scope="col" className="px-4 py-3 font-medium">
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {rows.map((row) => (
            <tr key={getKey(row)} className="transition-colors hover:bg-brand-soft/40">
              {columns.map((column) => (
                <td key={column.header} className="px-4 py-3 align-middle">
                  {column.cell(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
