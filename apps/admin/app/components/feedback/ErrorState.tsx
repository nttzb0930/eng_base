import { AlertTriangle, RotateCcw } from "lucide-react";

import { Button } from "@/app/components/ui/button";

type ErrorStateProps = {
  description?: string;
  onRetry?: () => void;
  title?: string;
};

export function ErrorState({
  description = "Không thể tải dữ liệu. Vui lòng thử lại.",
  onRetry,
  title = "Đã xảy ra lỗi",
}: ErrorStateProps) {
  return (
    <div
      aria-live="polite"
      className="flex min-h-56 flex-col items-center justify-center rounded-lg border border-destructive/20 bg-destructive/5 px-6 py-10 text-center"
      role="alert"
    >
      <span className="mb-4 flex size-10 items-center justify-center rounded-full bg-destructive/10 text-destructive">
        <AlertTriangle className="size-5" />
      </span>
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      <p className="mt-1 max-w-md text-sm font-normal text-muted-foreground">
        {description}
      </p>
      {onRetry ? (
        <Button className="mt-5" onClick={onRetry} size="sm" variant="outline">
          <RotateCcw />
          Thử lại
        </Button>
      ) : null}
    </div>
  );
}
