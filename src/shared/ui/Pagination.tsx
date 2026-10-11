import { Button } from "./Button";

interface PaginationProps {
  page: number;
  pageCount: number;
  onChange(page: number): void;
  /** Where the reader is, already worded: "Página 2 de 7 · 131 miembros". */
  status: string;
  labels: { navigation: string; previous: string; next: string };
}

/** Moves through a list the server sends a page at a time. */
export function Pagination({ page, pageCount, onChange, status, labels }: PaginationProps) {
  return (
    <nav aria-label={labels.navigation} className="flex flex-wrap items-center justify-between gap-3">
      <p aria-live="polite" className="text-sm text-muted">
        {status}
      </p>
      <div className="flex gap-2">
        <Button size="sm" variant="secondary" disabled={page <= 1} onClick={() => onChange(page - 1)}>
          {labels.previous}
        </Button>
        <Button size="sm" variant="secondary" disabled={page >= pageCount} onClick={() => onChange(page + 1)}>
          {labels.next}
        </Button>
      </div>
    </nav>
  );
}
