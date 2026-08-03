import { ToeicSkeletonBlock as Skeleton } from "@/app/features/toeic-reading/components/ToeicSkeletonBlock";

export function ToeicWritingResultSkeleton() {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="Loading"
      className="mx-auto w-full max-w-[1000px] px-4 py-8 sm:px-6"
    >
      <Skeleton className="h-5 w-40" />
      <Skeleton className="mt-7 h-9 w-72 max-w-full" />
      <Skeleton className="mt-3 h-4 w-52" />
      <div className="mt-7 grid gap-5 lg:grid-cols-2">
        <Skeleton className="h-80 rounded-md border" />
        <Skeleton className="h-[34rem] rounded-md border" />
      </div>
      <div className="mt-6 flex gap-3">
        <Skeleton className="h-11 w-36 rounded-md" />
        <Skeleton className="h-11 w-36 rounded-md" />
      </div>
    </div>
  );
}
