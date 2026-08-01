import { ToeicSkeletonBlock as Skeleton } from "./ToeicSkeletonBlock";

export function ToeicOverviewSkeleton() {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="Loading"
      className="mx-auto w-full max-w-[1000px] px-4 py-8 sm:px-6"
    >
      <Skeleton className="h-5 w-52" />
      <Skeleton className="mt-7 h-10 w-72" />
      <Skeleton className="mt-3 h-4 w-full max-w-xl" />
      <div className="mt-8 grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
        <Skeleton className="h-72 rounded-2xl border" />
        <Skeleton className="h-72 rounded-2xl border" />
      </div>
      <Skeleton className="mt-9 h-7 w-44" />
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <Skeleton className="h-28 rounded-2xl border" />
        <Skeleton className="h-28 rounded-2xl border" />
      </div>
    </div>
  );
}
