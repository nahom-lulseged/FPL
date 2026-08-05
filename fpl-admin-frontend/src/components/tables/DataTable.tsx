import clsx from 'clsx';
import { Fragment, type ReactNode } from 'react';
import { Button } from '@/components/common/Button';

export interface DataTableColumn<T> {
  key: string;
  label: string;
  sortable?: boolean;
  render?: (row: T) => ReactNode;
}

export interface DataTableMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  data: T[];
  meta: DataTableMeta;
  onPageChange: (page: number) => void;
  sortKey?: string;
  sortDir?: 'asc' | 'desc';
  onSortChange?: (key: string) => void;
  filters?: ReactNode;
  expandableRow?: (row: T) => ReactNode | null;
  expandedRowId?: string | null;
  getRowId: (row: T) => string;
  onRowClick?: (row: T) => void;
  isLoading?: boolean;
  emptyMessage?: string;
}

export function DataTable<T>({
  columns,
  data,
  meta,
  onPageChange,
  sortKey,
  sortDir = 'asc',
  onSortChange,
  filters,
  expandableRow,
  expandedRowId,
  getRowId,
  onRowClick,
  isLoading = false,
  emptyMessage = 'No rows found.',
}: DataTableProps<T>) {
  return (
    <div className="admin-table-shell rounded-lg border border-fpl-gray-200 bg-white shadow-sm">
      {filters ? <div className="border-b border-fpl-gray-200 p-4">{filters}</div> : null}

      <div className="admin-table-frame overflow-x-auto">
        <table className="admin-data-table min-w-full text-left text-sm">
          <thead className="border-b border-fpl-gray-200 bg-fpl-gray-50">
            <tr>
              {columns.map((column) => (
                <th key={column.key} className="px-4 py-2 font-semibold text-fpl-gray-900">
                  {column.sortable && onSortChange ? (
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 hover:text-fpl-purple"
                      onClick={() => onSortChange(column.key)}
                    >
                      {column.label}
                      {sortKey === column.key ? (
                        <span className="text-xs">{sortDir === 'asc' ? '↑' : '↓'}</span>
                      ) : null}
                    </button>
                  ) : (
                    column.label
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-8 text-center text-fpl-gray-500">
                  Loading…
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-8 text-center text-fpl-gray-500">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              data.map((row) => {
                const rowId = getRowId(row);
                const expanded = expandedRowId === rowId;
                const expansion = expandableRow?.(row);

                return (
                  <Fragment key={rowId}>
                    <tr
                      className={clsx(
                        'admin-data-row border-b border-fpl-gray-100',
                        (onRowClick || expansion) && 'cursor-pointer hover:bg-fpl-gray-50',
                      )}
                      onClick={() => onRowClick?.(row)}
                    >
                      {columns.map((column) => (
                        <td key={column.key} data-label={column.label} className="admin-data-cell px-4 py-2 text-fpl-gray-900">
                          {column.render ? column.render(row) : (row as Record<string, unknown>)[column.key] as ReactNode}
                        </td>
                      ))}
                    </tr>
                    {expanded && expansion ? (
                      <tr className="admin-data-expansion border-b border-fpl-gray-100 bg-fpl-gray-50">
                        <td colSpan={columns.length} className="px-4 py-3">
                          {expansion}
                        </td>
                      </tr>
                    ) : null}
                  </Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between border-t border-fpl-gray-200 px-4 py-3">
        <p className="text-xs text-fpl-gray-500">
          Page {meta.page} of {meta.totalPages} ({meta.total} total)
        </p>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            disabled={meta.page <= 1}
            onClick={() => onPageChange(meta.page - 1)}
          >
            Previous
          </Button>
          <Button
            variant="secondary"
            disabled={meta.page >= meta.totalPages}
            onClick={() => onPageChange(meta.page + 1)}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
