import React from 'react';
import { FiChevronLeft, FiChevronRight, FiChevronsLeft, FiChevronsRight } from 'react-icons/fi';

export const PaginationControls = ({
  currentPage = 1,
  totalPages = 1,
  totalItems = 0,
  pageSize = 25,
  onPageChange,
  isLoading = false,
}) => {
  if (totalPages <= 1 && totalItems <= pageSize) return null;

  const startItem = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);

  // Generate page numbers with smart ellipsis
  const getPageNumbers = () => {
    const delta = 2;
    const range = [];
    for (
      let i = Math.max(2, currentPage - delta);
      i <= Math.min(totalPages - 1, currentPage + delta);
      i++
    ) {
      range.push(i);
    }

    if (currentPage - delta > 2) {
      range.unshift('...');
    }
    if (currentPage + delta < totalPages - 1) {
      range.push('...');
    }

    range.unshift(1);
    if (totalPages > 1) {
      range.push(totalPages);
    }

    return range;
  };

  const pages = getPageNumbers();

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px',
        padding: '16px 20px',
        borderTop: '1px solid var(--border-color, #e2e8f0)',
        fontSize: '13px',
        color: 'var(--text-muted, #64748b)',
      }}
    >
      <div>
        Showing{' '}
        <strong style={{ color: 'var(--text-color, #0f172a)' }}>
          {startItem.toLocaleString()}–{endItem.toLocaleString()}
        </strong>{' '}
        of{' '}
        <strong style={{ color: 'var(--text-color, #0f172a)' }}>
          {totalItems.toLocaleString()}
        </strong>{' '}
        items
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
        {/* First Page */}
        <button
          onClick={() => onPageChange(1)}
          disabled={currentPage === 1 || isLoading}
          title="First Page"
          style={{
            padding: '6px 8px',
            borderRadius: '6px',
            border: '1px solid var(--border-color, #cbd5e1)',
            background: 'transparent',
            cursor: currentPage === 1 || isLoading ? 'not-allowed' : 'pointer',
            opacity: currentPage === 1 || isLoading ? 0.4 : 1,
            color: 'inherit',
          }}
        >
          <FiChevronsLeft size={14} />
        </button>

        {/* Previous Page */}
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1 || isLoading}
          title="Previous Page"
          style={{
            padding: '6px 10px',
            borderRadius: '6px',
            border: '1px solid var(--border-color, #cbd5e1)',
            background: 'transparent',
            cursor: currentPage === 1 || isLoading ? 'not-allowed' : 'pointer',
            opacity: currentPage === 1 || isLoading ? 0.4 : 1,
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            color: 'inherit',
          }}
        >
          <FiChevronLeft size={14} /> Prev
        </button>

        {/* Numeric Page Buttons */}
        {pages.map((p, idx) =>
          p === '...' ? (
            <span key={`ellipsis-${idx}`} style={{ padding: '0 6px' }}>
              …
            </span>
          ) : (
            <button
              key={p}
              onClick={() => onPageChange(p)}
              disabled={isLoading || currentPage === p}
              style={{
                minWidth: '32px',
                height: '32px',
                padding: '0 6px',
                borderRadius: '6px',
                border: '1px solid',
                borderColor:
                  currentPage === p
                    ? 'var(--accent-color, #2563eb)'
                    : 'var(--border-color, #cbd5e1)',
                background:
                  currentPage === p
                    ? 'var(--accent-color, #2563eb)'
                    : 'transparent',
                color: currentPage === p ? '#fff' : 'inherit',
                fontWeight: currentPage === p ? 700 : 500,
                cursor: currentPage === p || isLoading ? 'default' : 'pointer',
              }}
            >
              {p}
            </button>
          )
        )}

        {/* Next Page */}
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages || isLoading}
          title="Next Page"
          style={{
            padding: '6px 10px',
            borderRadius: '6px',
            border: '1px solid var(--border-color, #cbd5e1)',
            background: 'transparent',
            cursor: currentPage === totalPages || isLoading ? 'not-allowed' : 'pointer',
            opacity: currentPage === totalPages || isLoading ? 0.4 : 1,
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            color: 'inherit',
          }}
        >
          Next <FiChevronRight size={14} />
        </button>

        {/* Last Page */}
        <button
          onClick={() => onPageChange(totalPages)}
          disabled={currentPage === totalPages || isLoading}
          title="Last Page"
          style={{
            padding: '6px 8px',
            borderRadius: '6px',
            border: '1px solid var(--border-color, #cbd5e1)',
            background: 'transparent',
            cursor: currentPage === totalPages || isLoading ? 'not-allowed' : 'pointer',
            opacity: currentPage === totalPages || isLoading ? 0.4 : 1,
            color: 'inherit',
          }}
        >
          <FiChevronsRight size={14} />
        </button>
      </div>
    </div>
  );
};

export default PaginationControls;
