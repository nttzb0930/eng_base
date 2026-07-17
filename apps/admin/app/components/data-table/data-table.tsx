import { cn } from "@/app/utils/cn";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/app/components/ui/pagination";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/app/components/ui/table";
import { ArrowDown, ArrowUp, Loader2 } from "lucide-react";
import * as React from "react";

export interface Column<T> {
  header: string;
  accessorKey?: keyof T | string;
  cell?: (item: T) => React.ReactNode;
  sortable?: boolean;
  className?: string;
}

export interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  isLoading?: boolean;
  isFetching?: boolean;
  emptyMessage?: string;

  // Sorting
  sortField?: string | null;
  sortOrder?: "asc" | "desc" | null;
  onSort?: (field: string) => void;

  // Pagination
  currentPage?: number;
  pageSize?: number;
  totalItems?: number;
  totalPages?: number;
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
}

export function DataTable<T>({
  data,
  columns,
  isLoading,
  isFetching,
  emptyMessage = "Không tìm thấy bản ghi nào.",
  sortField,
  sortOrder,
  onSort,
  currentPage = 1,
  pageSize = 10,
  totalItems = 0,
  totalPages = 1,
  onPageChange,
  onPageSizeChange,
}: DataTableProps<T>) {
  const rootRef = React.useRef<HTMLDivElement | null>(null);

  const scrollToTop = React.useCallback(() => {
    rootRef.current?.scrollIntoView({ block: "start", behavior: "smooth" });
  }, []);

  const handlePageChange = React.useCallback(
    (page: number) => {
      onPageChange?.(page);
      window.requestAnimationFrame(scrollToTop);
    },
    [onPageChange, scrollToTop]
  );

  const handlePageSizeChange = React.useCallback(
    (size: number) => {
      onPageSizeChange?.(size);
      window.requestAnimationFrame(scrollToTop);
    },
    [onPageSizeChange, scrollToTop]
  );

  // Sliding window pagination with ellipsis
  const generatePages = (): (number | "...")[] => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    if (currentPage <= 4) {
      return [1, 2, 3, 4, 5, "...", totalPages];
    }
    if (currentPage >= totalPages - 3) {
      return [
        1,
        "...",
        totalPages - 4,
        totalPages - 3,
        totalPages - 2,
        totalPages - 1,
        totalPages,
      ];
    }
    return [
      1,
      "...",
      currentPage - 1,
      currentPage,
      currentPage + 1,
      "...",
      totalPages,
    ];
  };

  const pages = generatePages();
  const showSkeleton = isLoading && data.length === 0;

  return (
    <div ref={rootRef} className="relative flex flex-col gap-4">
      {/* Fetching progress bar */}
      <div
        className={cn(
          "absolute top-0 left-0 right-0 h-0.5 bg-zinc-200 overflow-hidden z-10 transition-opacity duration-300 rounded-full",
          isFetching ? "opacity-100" : "opacity-0"
        )}
      >
        <div className="h-full bg-zinc-900 animate-[progress_1.5s_ease-in-out_infinite]" />
      </div>

      {/* Table */}
      <div className="w-full overflow-auto rounded-lg border border-zinc-200 bg-white">
        <Table>
          <TableHeader>
            <TableRow className="bg-zinc-50/80 hover:bg-zinc-50">
              {columns.map((column, index) => (
                <TableHead
                  key={index}
                  className={cn(
                    "font-bold text-zinc-500 text-xs whitespace-nowrap",
                    column.sortable && onSort && "cursor-pointer select-none hover:text-zinc-900 transition-colors",
                    column.className
                  )}
                  onClick={() => column.sortable && onSort?.(String(column.accessorKey))}
                >
                  <div
                    className={cn(
                      "flex items-center gap-1.5",
                      column.className?.includes("text-center") && "justify-center",
                      column.className?.includes("text-right") && "justify-end"
                    )}
                  >
                    <span>{column.header}</span>
                    {column.sortable && sortField === String(column.accessorKey) && (
                      <span className="text-zinc-900">
                        {sortOrder === "asc" ? (
                          <ArrowUp className="h-3.5 w-3.5" />
                        ) : (
                          <ArrowDown className="h-3.5 w-3.5" />
                        )}
                      </span>
                    )}
                  </div>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {showSkeleton ? (
              Array.from({ length: pageSize }).map((_, i) => (
                <TableRow key={i}>
                  {columns.map((_, j) => (
                    <TableCell key={j}>
                      <div className="h-4 w-full max-w-[160px] animate-pulse rounded bg-zinc-100" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : data.length === 0 ? (
              <TableRow className="hover:bg-transparent">
                <TableCell
                  colSpan={columns.length}
                  className="h-32 text-center text-zinc-400 font-medium"
                >
                  {emptyMessage}
                </TableCell>
              </TableRow>
            ) : (
              data.map((item, i) => (
                <TableRow
                  key={i}
                  className="hover:bg-zinc-50/50 transition-colors border-zinc-100"
                >
                  {columns.map((column, j) => (
                    <TableCell
                      key={j}
                      className={cn("whitespace-nowrap", column.className)}
                    >
                      {column.cell
                        ? column.cell(item)
                        : (item[column.accessorKey as keyof T] as React.ReactNode)}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 0 && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between px-1">
          <div className="flex items-center gap-2 text-xs text-zinc-500 font-medium">
            <span>Hiển thị mỗi trang:</span>
            <Select
              value={pageSize.toString()}
              onValueChange={(v) => handlePageSizeChange(Number(v))}
            >
              <SelectTrigger className="h-7 w-[60px] text-xs border-zinc-200">
                <SelectValue placeholder={pageSize} />
              </SelectTrigger>
              <SelectContent side="top">
                {[10, 20, 30, 50].map((size) => (
                  <SelectItem key={size} value={size.toString()} className="text-xs">
                    {size}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span className="hidden sm:inline">
              | Hiển thị {Math.min((currentPage - 1) * pageSize + 1, totalItems)}–{Math.min(currentPage * pageSize, totalItems)} / {totalItems}
            </span>
          </div>

          <Pagination className="mx-0 w-auto justify-end">
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    if (currentPage > 1) handlePageChange(currentPage - 1);
                  }}
                  className={cn(
                    "cursor-pointer h-8 text-xs",
                    currentPage <= 1 && "pointer-events-none opacity-50"
                  )}
                />
              </PaginationItem>

              {pages.map((page, index) => (
                <PaginationItem key={index}>
                  {page === "..." ? (
                    <PaginationEllipsis />
                  ) : (
                    <PaginationLink
                      href="#"
                      isActive={page === currentPage}
                      onClick={(e) => {
                        e.preventDefault();
                        handlePageChange(page as number);
                      }}
                      className="cursor-pointer h-8 w-8 text-xs"
                    >
                      {page}
                    </PaginationLink>
                  )}
                </PaginationItem>
              ))}

              <PaginationItem>
                <PaginationNext
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    if (currentPage < totalPages) handlePageChange(currentPage + 1);
                  }}
                  className={cn(
                    "cursor-pointer h-8 text-xs",
                    currentPage >= totalPages && "pointer-events-none opacity-50"
                  )}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}
    </div>
  );
}
