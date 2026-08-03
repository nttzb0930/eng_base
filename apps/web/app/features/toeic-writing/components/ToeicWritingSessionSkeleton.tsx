import { ToeicSkeletonBlock as Skeleton } from "@/app/features/toeic-reading/components/ToeicSkeletonBlock";

export function ToeicWritingSessionSkeleton() {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="Loading"
      className="mx-auto w-full max-w-[1200px] px-4 py-6 sm:px-6"
    >
      <div className="flex items-center justify-between gap-4">
        <Skeleton className="h-5 w-36" />
        <Skeleton className="h-6 w-24 rounded-md" />
      </div>
      <Skeleton className="mt-6 h-8 w-72 max-w-full" />
      <div className="mt-6 grid gap-5 lg:grid-cols-2">
        <Skeleton className="h-[32rem] rounded-md border" />
        <Skeleton className="h-[32rem] rounded-md border" />
      </div>
      <Skeleton className="mt-6 h-16 rounded-md border" />
    </div>
  );
}
