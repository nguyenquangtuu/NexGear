'use client';

import { ChevronLeft, ChevronRight, MoreHorizontal } from 'lucide-react';

interface AdminPaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export default function AdminPagination({
  currentPage,
  totalPages,
  onPageChange,
}: AdminPaginationProps) {
  if (totalPages <= 1) return null;

  const getPages = () => {
    const pages: (number | string)[] = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      // Always show first page
      pages.push(1);
      
      if (currentPage > 3) {
        pages.push('...');
      }

      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);

      // Adjust if at boundaries
      let adjustedStart = start;
      let adjustedEnd = end;
      
      if (currentPage <= 3) {
          adjustedEnd = 4;
      }
      if (currentPage >= totalPages - 2) {
          adjustedStart = totalPages - 3;
      }

      for (let i = Math.max(2, adjustedStart); i <= Math.min(totalPages - 1, adjustedEnd); i++) {
        if (!pages.includes(i)) pages.push(i);
      }

      if (currentPage < totalPages - 2) {
        if (!pages.includes('...')) pages.push('...');
      }

      // Always show last page
      if (!pages.includes(totalPages)) pages.push(totalPages);
    }
    return pages;
  };

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-6 py-5 border-t border-border bg-secondary/5">
      <div className="text-sm font-medium text-muted-foreground">
        Trang <span className="font-black text-foreground">{currentPage}</span> trên tổng số <span className="font-black text-foreground">{totalPages}</span> trang
      </div>
      
      <div className="flex items-center gap-1.5">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-card shadow-sm transition-all hover:bg-secondary hover:border-primary/30 disabled:opacity-30 disabled:cursor-not-allowed group"
          title="Trang trước"
        >
          <ChevronLeft size={18} className="group-hover:-translate-x-0.5 transition-transform" />
        </button>

        <div className="flex items-center gap-1.5">
          {getPages().map((p, i) => (
            p === '...' ? (
              <div key={`dots-${i}`} className="flex h-10 w-10 items-center justify-center text-muted-foreground">
                <MoreHorizontal size={16} />
              </div>
            ) : (
              <button
                key={p}
                onClick={() => onPageChange(Number(p))}
                className={`flex h-10 min-w-[40px] items-center justify-center rounded-xl border px-3 text-sm font-black transition-all ${
                  currentPage === p
                    ? 'border-primary bg-primary text-white shadow-lg shadow-primary/25 scale-105 z-10'
                    : 'border-border bg-card text-muted-foreground hover:border-primary/50 hover:text-primary hover:shadow-md'
                }`}
              >
                {p}
              </button>
            )
          ))}
        </div>

        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-card shadow-sm transition-all hover:bg-secondary hover:border-primary/30 disabled:opacity-30 disabled:cursor-not-allowed group"
          title="Trang sau"
        >
          <ChevronRight size={18} className="group-hover:translate-x-0.5 transition-transform" />
        </button>
      </div>
    </div>
  );
}
