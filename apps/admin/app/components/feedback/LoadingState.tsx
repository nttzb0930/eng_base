import { Skeleton } from "@/app/components/ui/skeleton";

import { TableSkeleton } from "./TableSkeleton";

type LoadingStateProps = {
  label?: string;
  rows?: number;
  variant?: "page" | "table";
};

export function LoadingState({
  label = "Đang tải dữ liệu",
  rows = 5,
  variant = "page",
}: LoadingStateProps) {
  return (
    <div aria-busy="true" aria-live="polite">
      <span className="sr-only">{label}</span>
      {variant === "table" ? (
        <TableSkeleton rowsCount={rows} />
      ) : (
        <div className="space-y-5">
          <div className="space-y-2">
            <Skeleton className="h-7 w-56" />
            <Skeleton className="h-4 w-full max-w-lg" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: rows }, (_, index) => (
              <Skeleton className="h-32" key={`page-loading-${index}`} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
