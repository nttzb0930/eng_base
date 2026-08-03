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
      <div className="mt-7 flex gap-1">
        <Skeleton className="h-11 w-44 rounded-md" />
        <Skeleton className="h-11 w-44 rounded-md" />
      </div>
      <div className="mt-6 flex flex-wrap gap-2">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-9 w-24 rounded-md" />
        ))}
      </div>
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, index) => (
          <div key={index} className="overflow-hidden rounded-md border">
            <Skeleton className="aspect-[4/3] w-full rounded-none" />
            <div className="flex items-center justify-between gap-3 p-3">
              <Skeleton className="h-7 w-24 rounded-md" />
              <Skeleton className="h-10 w-24 rounded-md" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
