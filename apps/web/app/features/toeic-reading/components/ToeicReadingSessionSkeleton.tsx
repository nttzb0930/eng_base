import { ToeicSkeletonBlock as Skeleton } from "./ToeicSkeletonBlock";

export function ToeicReadingSessionSkeleton() {
  return (
    <main
      role="status"
      aria-busy="true"
      aria-label="Loading"
      className="bg-background min-h-dvh"
    >
      <div className="bg-card border-b px-4 py-4 sm:px-6">
        <div className="mx-auto flex max-w-[1280px] items-center gap-5">
          <Skeleton className="h-5 w-36" />
          <Skeleton className="h-2 flex-1 rounded-full" />
          <Skeleton className="h-5 w-20" />
        </div>
      </div>
      <div className="mx-auto grid max-w-[1280px] gap-6 px-4 py-7 sm:px-6 xl:grid-cols-[minmax(0,1fr)_300px]">
        <div>
          <Skeleton className="h-8 w-56" />
          <Skeleton className="mt-3 h-4 w-80" />
          <Skeleton className="mt-7 h-56 rounded-2xl border" />
          <div className="mt-5 space-y-4">
            {Array.from({ length: 3 }).map((_, index) => (
              <Skeleton key={index} className="h-64 rounded-2xl border" />
            ))}
          </div>
        </div>
        <Skeleton className="order-first h-[520px] rounded-2xl border xl:order-last" />
      </div>
    </main>
  );
}
