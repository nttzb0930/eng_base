import { ToeicSkeletonBlock as Skeleton } from "@/app/features/toeic-reading/components/ToeicSkeletonBlock";

export function ToeicGrammarCatalogSkeleton() {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="Loading"
      className="mx-auto w-full max-w-[1100px] px-4 py-8 sm:px-6"
    >
      <Skeleton className="h-5 w-56" />
      <Skeleton className="mt-7 h-10 w-80" />
      <Skeleton className="mt-3 h-4 w-full max-w-2xl" />
      <Skeleton className="mt-7 h-12 w-80 rounded-2xl" />
      <div className="mt-6 flex gap-6 border-b pb-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <Skeleton key={index} className="h-6 w-28" />
        ))}
      </div>
      <div className="mt-6 grid gap-5 md:grid-cols-2">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="rounded-2xl border p-5">
            <Skeleton className="h-5 w-44" />
            <Skeleton className="mt-3 h-4 w-full" />
            <Skeleton className="mt-7 h-2 w-full rounded-full" />
            <Skeleton className="mt-4 h-11 w-full rounded-xl" />
          </div>
        ))}
      </div>
    </div>
  );
}
