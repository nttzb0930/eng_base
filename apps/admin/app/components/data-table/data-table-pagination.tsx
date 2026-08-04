import { ChevronLeft, ChevronRight, MoreHorizontal } from "lucide-react";

import { Button } from "@/app/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/components/ui/select";

type DataTablePaginationProps = {
  currentPage: number;
  onPageChange(page: number): void;
  onPageSizeChange(size: number): void;
  pageSize: number;
  totalItems: number;
  totalPages: number;
};

type PageToken =
  | { key: string; kind: "ellipsis" }
  | { key: string; kind: "page"; page: number };

function createPageTokens(currentPage: number, totalPages: number): PageToken[] {
  let values: Array<number | "ellipsis-left" | "ellipsis-right">;

  if (totalPages <= 7) {
    values = Array.from({ length: totalPages }, (_, index) => index + 1);
  } else if (currentPage <= 4) {
    values = [1, 2, 3, 4, 5, "ellipsis-right", totalPages];
  } else if (currentPage >= totalPages - 3) {
    values = [
      1,
      "ellipsis-left",
      totalPages - 4,
      totalPages - 3,
      totalPages - 2,
      totalPages - 1,
      totalPages,
    ];
  } else {
    values = [
      1,
      "ellipsis-left",
      currentPage - 1,
      currentPage,
      currentPage + 1,
      "ellipsis-right",
      totalPages,
    ];
  }

  return values.map((value) =>
    typeof value === "number"
      ? { key: `page-${value}`, kind: "page", page: value }
      : { key: value, kind: "ellipsis" },
  );
}

export function DataTablePagination({
  currentPage,
  onPageChange,
  onPageSizeChange,
  pageSize,
  totalItems,
  totalPages,
}: DataTablePaginationProps) {
  const firstItem = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const lastItem = Math.min(currentPage * pageSize, totalItems);
  const pages = createPageTokens(currentPage, totalPages);

  return (
    <div className="flex flex-col gap-3 border-t px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-wrap items-center gap-2 text-xs font-normal text-muted-foreground">
        <span>Hiển thị mỗi trang</span>
        <Select
          onValueChange={(value) => onPageSizeChange(Number(value))}
          value={String(pageSize)}
        >
          <SelectTrigger aria-label="Số bản ghi mỗi trang" className="h-8 w-20">
            <SelectValue />
          </SelectTrigger>
          <SelectContent side="top">
            {[10, 20, 30, 50].map((size) => (
              <SelectItem key={size} value={String(size)}>
                {size}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span>
          {firstItem}–{lastItem} / {totalItems}
        </span>
      </div>

      <div aria-label="Phân trang" className="flex items-center gap-1" role="navigation">
        <Button
          aria-label="Trang trước"
          disabled={currentPage <= 1}
          onClick={() => onPageChange(currentPage - 1)}
          size="icon-sm"
          variant="outline"
        >
          <ChevronLeft />
        </Button>
        {pages.map((token) =>
          token.kind === "ellipsis" ? (
            <span
              aria-hidden="true"
              className="flex size-8 items-center justify-center text-muted-foreground"
              key={token.key}
            >
              <MoreHorizontal className="size-4" />
            </span>
          ) : (
            <Button
              aria-current={token.page === currentPage ? "page" : undefined}
              aria-label={`Trang ${token.page}`}
              key={token.key}
              onClick={() => onPageChange(token.page)}
              size="icon-sm"
              variant={token.page === currentPage ? "default" : "outline"}
            >
              {token.page}
            </Button>
          ),
        )}
        <Button
          aria-label="Trang sau"
          disabled={currentPage >= totalPages}
          onClick={() => onPageChange(currentPage + 1)}
          size="icon-sm"
          variant="outline"
        >
          <ChevronRight />
        </Button>
      </div>
    </div>
  );
}
