import type { ReactNode } from "react";

export interface Column<T> {
  accessorKey?: keyof T | string;
  cell?: (item: T) => ReactNode;
  className?: string;
  header: string;
  sortable?: boolean;
}

export interface DataTableProps<T> {
  columns: Column<T>[];
  currentPage?: number;
  data: T[];
  emptyMessage?: string;
  getRowId?: (item: T) => string;
  isFetching?: boolean;
  isLoading?: boolean;
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  onSort?: (field: string) => void;
  pageSize?: number;
  sortField?: string | null;
  sortOrder?: "asc" | "desc" | null;
  totalItems?: number;
  totalPages?: number;
}
