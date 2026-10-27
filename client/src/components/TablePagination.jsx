import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
export default function TablePagination({
  total,
  page,
  pageSize = 10,
  onChange,
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize)),
    current = Math.min(page, pages);
  return (
    <div className="table-pagination">
      <span>
        {total
          ? `${(current - 1) * pageSize + 1}–${Math.min(current * pageSize, total)} de ${total}`
          : "0 registros"}
      </span>
      <div>
        <button
          className="btn btn-secondary btn-icon btn-sm"
          aria-label="Página anterior"
          disabled={current <= 1}
          onClick={() => onChange(current - 1)}
        >
          <ChevronLeft size={15} />
        </button>
        <span>
          {current} / {pages}
        </span>
        <button
          className="btn btn-secondary btn-icon btn-sm"
          aria-label="Página siguiente"
          disabled={current >= pages}
          onClick={() => onChange(current + 1)}
        >
          <ChevronRight size={15} />
        </button>
      </div>
    </div>
  );
}
