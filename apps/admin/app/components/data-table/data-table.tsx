"use client";

import {
  flexRender,
  getCoreRowModel,
  type ColumnDef,
  type SortingState,
  useReactTable,
} from "@tanstack/react-table";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import * as React from "react";

import { EmptyState } from "@/app/components/feedback/EmptyState";
import { Button } from "@/app/components/ui/button";
import { Skeleton } from "@/app/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/app/components/ui/table";
import { cn } from "@/app/utils/cn";

import { DataTablePagination } from "./data-table-pagination";
import type { DataTableProps } from "./data-table.types";

export function DataTable<T>({
  columns,
  currentPage = 1,
  data,
  emptyMessage = "Không tìm thấy bản ghi nào.",
  getRowId,
  isFetching = false,
  isLoading = false,
  onPageChange,
  onPageSizeChange,
  onSort,
  pageSize = 10,
  sortField = null,
  sortOrder = null,
  totalItems = 0,
  totalPages = 1,
}: DataTableProps<T>) {
  const rootRef = React.useRef<HTMLDivElement | null>(null);
  const sorting = React.useMemo<SortingState>(
    () =>
      sortField && sortOrder
        ? [{ desc: sortOrder === "desc", id: sortField }]
        : [],
    [sortField, sortOrder],
  );
  const tableColumns = React.useMemo<ColumnDef<T>[]>(
    () =>
      columns.map((column) => {
        const accessorKey = column.accessorKey
          ? String(column.accessorKey)
          : undefined;
        return {
          accessorFn: accessorKey
            ? (item: T) => item[column.accessorKey as keyof T]
            : undefined,
          cell: ({ getValue, row }) =>
            column.cell
              ? column.cell(row.original)
              : (getValue() as React.ReactNode),
          header: column.header,
          id: accessorKey ?? column.header,
        } satisfies ColumnDef<T>;
      }),
    [columns],
  );
  const columnsById = React.useMemo(
    () =>
      new Map(
        columns.map((column) => [
          column.accessorKey ? String(column.accessorKey) : column.header,
          column,
        ]),
      ),
    [columns],
  );
  // TanStack Table intentionally exposes stateful callbacks that React Compiler skips.
  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    columns: tableColumns,
    data,
    getCoreRowModel: getCoreRowModel(),
    getRowId: getRowId ? (item) => getRowId(item) : undefined,
    manualPagination: true,
    manualSorting: true,
    pageCount: totalPages,
    state: { sorting },
  });

  const scrollToTop = React.useCallback(() => {
    rootRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);
  const handlePageChange = React.useCallback(
    (page: number) => {
      onPageChange?.(page);
      window.requestAnimationFrame(scrollToTop);
    },
    [onPageChange, scrollToTop],
  );
  const handlePageSizeChange = React.useCallback(
    (size: number) => {
      onPageSizeChange?.(size);
      window.requestAnimationFrame(scrollToTop);
    },
    [onPageSizeChange, scrollToTop],
  );

  return (
    <div className="relative" ref={rootRef}>
      <div
        aria-hidden={!isFetching}
        className={cn(
          "absolute inset-x-0 top-0 z-10 h-0.5 overflow-hidden bg-muted transition-opacity",
          isFetching ? "opacity-100" : "opacity-0",
        )}
        role="progressbar"
      >
        <div className="h-full w-1/3 animate-pulse bg-primary" />
      </div>

      <div className="w-full overflow-hidden rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow className="bg-muted/40 hover:bg-muted/40" key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  const definition = columnsById.get(header.column.id);
                  const sortable = Boolean(
                    definition?.sortable && definition.accessorKey && onSort,
                  );
                  const activeSort = sortField === header.column.id;
                  const ariaSort = activeSort
                    ? sortOrder === "asc"
                      ? "ascending"
                      : "descending"
                    : "none";
                  return (
                    <TableHead
                      aria-sort={sortable ? ariaSort : undefined}
                      className={cn("text-xs", definition?.className)}
                      key={header.id}
                    >
                      {sortable ? (
                        <Button
                          className={cn(
                            "h-8 -ml-2 px-2 text-xs",
                            definition?.className?.includes("text-center") &&
                              "mx-auto",
                            definition?.className?.includes("text-right") &&
                              "ml-auto -mr-2",
                          )}
                          onClick={() => onSort?.(header.column.id)}
                          size="sm"
                          variant="ghost"
                        >
                          {flexRender(
                            header.column.columnDef.header,
                            header.getContext(),
                          )}
                          {activeSort ? (
                            sortOrder === "asc" ? (
                              <ArrowUp />
                            ) : (
                              <ArrowDown />
                            )
                          ) : (
                            <ArrowUpDown className="text-muted-foreground" />
                          )}
                        </Button>
                      ) : (
                        flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )
                      )}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {isLoading && data.length === 0 ? (
              Array.from({ length: pageSize }, (_, rowIndex) => (
                <TableRow key={`loading-row-${rowIndex}`}>
                  {tableColumns.map((column) => (
                    <TableCell key={`loading-${rowIndex}-${String(column.id)}`}>
                      <Skeleton className="h-4 w-full max-w-40" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : table.getRowModel().rows.length === 0 ? (
              <TableRow className="hover:bg-transparent">
                <TableCell className="p-4" colSpan={columns.length}>
                  <EmptyState
                    description={emptyMessage}
                    title="Không có dữ liệu"
                  />
                </TableCell>
              </TableRow>
            ) : (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => {
                    const definition = columnsById.get(cell.column.id);
                    return (
                      <TableCell
                        className={definition?.className}
                        key={cell.id}
                      >
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext(),
                        )}
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {totalPages > 0 ? (
        <DataTablePagination
          currentPage={currentPage}
          onPageChange={handlePageChange}
          onPageSizeChange={handlePageSizeChange}
          pageSize={pageSize}
          totalItems={totalItems}
          totalPages={totalPages}
        />
      ) : null}
    </div>
  );
}

export type { Column, DataTableProps } from "./data-table.types";
