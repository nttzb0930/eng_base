import { ToeicSkeletonBlock as Skeleton } from "@/app/features/toeic-reading/components/ToeicSkeletonBlock";

export function ToeicGrammarLessonSkeleton() {
  return (
    <div
      className="mx-auto w-full max-w-[1180px] px-4 py-8 sm:px-6"
      role="status"
      aria-busy="true"
    >
      <Skeleton className="h-5 w-52" />
      <div className="mt-7 lg:hidden">
        <Skeleton className="h-4 w-40" />
        <div className="mt-3 flex gap-3 overflow-hidden">
          <Skeleton className="h-24 min-w-[220px] rounded-xl" />
          <Skeleton className="h-24 min-w-[220px] rounded-xl" />
        </div>
      </div>
      <div className="mt-7 grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
        <div className="hidden space-y-3 rounded-2xl border p-4 lg:block">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-20 rounded-xl" />
          <Skeleton className="h-20 rounded-xl" />
          <Skeleton className="h-20 rounded-xl" />
        </div>
        <div>
          <Skeleton className="h-4 w-36" />
          <Skeleton className="mt-3 h-10 w-72" />
          <Skeleton className="mt-4 h-12 w-full rounded-xl" />
          <Skeleton className="mt-6 h-96 w-full rounded-2xl" />
        </div>
      </div>
    </div>
  );
}
