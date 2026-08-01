import { ToeicSkeletonBlock as Skeleton } from "@/app/features/toeic-reading/components/ToeicSkeletonBlock";

export function ToeicGrammarLessonSkeleton() {
  return (
    <div
      className="mx-auto w-full max-w-[1180px] px-4 py-8 sm:px-6"
      role="status"
      aria-busy="true"
    >
      <Skeleton className="h-5 w-52" />
      <div className="mt-7 grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
        <Skeleton className="h-72 rounded-2xl" />
        <div>
          <Skeleton className="h-10 w-72" />
          <Skeleton className="mt-4 h-12 w-full rounded-xl" />
          <Skeleton className="mt-6 h-96 w-full rounded-2xl" />
        </div>
      </div>
    </div>
  );
}
