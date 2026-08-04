import { cn } from "@/app/utils/cn";

export function ToeicSkeletonBlock({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      aria-hidden="true"
      className={cn("bg-muted animate-pulse rounded-lg", className)}
      {...props}
    />
  );
}
