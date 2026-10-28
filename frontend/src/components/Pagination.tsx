export interface PaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

/** Compact pager: Prev, a window of page numbers, Next. */
const Pagination = ({ page, totalPages, onPageChange }: PaginationProps) => {
  if (totalPages <= 1) return null;

  const pages: number[] = [];
  const start = Math.max(1, Math.min(page - 2, totalPages - 4));
  const end = Math.min(totalPages, start + 4);
  for (let p = start; p <= end; p++) pages.push(p);

  const btn =
    "min-w-9 h-9 px-3 border text-sm font-medium transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed";

  return (
    <nav aria-label="Pagination" className="flex flex-wrap items-center justify-center gap-2 mt-8">
      <button type="button" className={`${btn} border-gray-300 hover:bg-gray-100`} disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
        Prev
      </button>
      {start > 1 && (
        <>
          <button type="button" className={`${btn} border-gray-300 hover:bg-gray-100`} onClick={() => onPageChange(1)}>1</button>
          {start > 2 && <span className="text-gray-400">…</span>}
        </>
      )}
      {pages.map((p) => (
        <button
          key={p}
          type="button"
          aria-current={p === page ? "page" : undefined}
          className={`${btn} ${p === page ? "bg-black text-white border-black" : "border-gray-300 hover:bg-gray-100"}`}
          onClick={() => onPageChange(p)}
        >
          {p}
        </button>
      ))}
      {end < totalPages && (
        <>
          {end < totalPages - 1 && <span className="text-gray-400">…</span>}
          <button type="button" className={`${btn} border-gray-300 hover:bg-gray-100`} onClick={() => onPageChange(totalPages)}>{totalPages}</button>
        </>
      )}
      <button type="button" className={`${btn} border-gray-300 hover:bg-gray-100`} disabled={page >= totalPages} onClick={() => onPageChange(page + 1)}>
        Next
      </button>
    </nav>
  );
};

export default Pagination;
