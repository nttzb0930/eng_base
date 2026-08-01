import { ToeicSkeletonBlock as Skeleton } from "@/app/features/toeic-reading/components/ToeicSkeletonBlock";

export function ToeicGrammarPracticeSkeleton() {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="Loading"
      className="mx-auto min-h-dvh w-full max-w-[1000px] px-4 py-6 sm:px-6"
    >
      <div className="flex items-center justify-between">
        <Skeleton className="h-5 w-48" />
        <Skeleton className="h-5 w-20" />
      </div>
      <Skeleton className="mt-6 h-2 w-full rounded-full" />
      <div className="mt-8 rounded-2xl border p-7">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="mt-4 h-7 w-full max-w-2xl" />
        <div className="mt-7 space-y-3">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-14 w-full rounded-xl" />
          ))}
        </div>
      </div>
    </div>
  );
}
