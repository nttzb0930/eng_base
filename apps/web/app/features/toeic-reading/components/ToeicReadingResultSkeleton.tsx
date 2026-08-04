import { ToeicSkeletonBlock as Skeleton } from "./ToeicSkeletonBlock";

export function ToeicReadingResultSkeleton() {
  return (
    <main
      role="status"
      aria-busy="true"
      aria-label="Loading"
      className="bg-background min-h-dvh px-4 py-8 sm:px-6"
    >
      <div className="mx-auto max-w-4xl">
        <Skeleton className="h-5 w-40" />
        <div className="mt-6 rounded-2xl border p-7">
          <Skeleton className="h-4 w-36" />
          <Skeleton className="mt-4 h-10 w-72" />
          <Skeleton className="mt-7 h-16 w-32" />
          <div className="mt-7 grid gap-3 sm:grid-cols-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <Skeleton key={index} className="h-24 rounded-xl" />
            ))}
          </div>
        </div>
        <Skeleton className="mt-9 h-7 w-52" />
        <div className="mt-4 space-y-4">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} className="h-64 rounded-2xl border" />
          ))}
        </div>
      </div>
    </main>
  );
}
