import { ToeicSkeletonBlock as Skeleton } from "./ToeicSkeletonBlock";

export function ToeicReadingListSkeleton() {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="Loading"
      className="mx-auto w-full max-w-[1000px] px-4 py-8 sm:px-6"
    >
      <Skeleton className="h-5 w-60" />
      <Skeleton className="mt-7 h-10 w-80" />
      <Skeleton className="mt-3 h-4 w-full max-w-2xl" />
      <div className="mt-8 grid gap-5 md:grid-cols-2">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="rounded-2xl border p-6">
            <div className="flex items-center justify-between">
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-6 w-20 rounded-full" />
            </div>
            <div className="mt-6 grid grid-cols-3 gap-3">
              {Array.from({ length: 3 }).map((__, partIndex) => (
                <Skeleton key={partIndex} className="h-16 rounded-xl" />
              ))}
            </div>
            <Skeleton className="mt-6 h-11 w-full rounded-xl" />
          </div>
        ))}
      </div>
    </div>
  );
}
