import { ToeicSkeletonBlock as Skeleton } from "@/app/features/toeic-reading/components/ToeicSkeletonBlock";

export function ToeicWritingCatalogSkeleton() {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="Loading"
      className="mx-auto w-full max-w-[1000px] px-4 py-8 sm:px-6"
    >
      <Skeleton className="h-5 w-40" />
      <Skeleton className="mt-7 h-10 w-72 max-w-full" />
      <Skeleton className="mt-3 h-4 w-full max-w-xl" />
      <div className="mt-7 flex gap-3">
        <Skeleton className="h-11 w-40 rounded-xl" />
        <Skeleton className="h-11 w-40 rounded-xl" />
      </div>
      <div className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <Skeleton key={index} className="h-20 rounded-xl" />
        ))}
      </div>
      <div className="mt-8 grid gap-5 md:grid-cols-2">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-64 rounded-2xl border" />
        ))}
      </div>
    </div>
  );
}
