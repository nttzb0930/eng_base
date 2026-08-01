function Skeleton({ className }: { className: string }) {
  return <div className={`bg-muted animate-pulse ${className}`} />;
}

export function ToeicListeningListSkeleton() {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="Loading"
      className="mx-auto w-full max-w-[1000px] px-4 py-8 sm:px-6"
    >
      <Skeleton className="h-5 w-52 rounded" />
      <Skeleton className="mt-7 h-10 w-80 rounded" />
      <Skeleton className="mt-3 h-4 w-full max-w-2xl rounded" />
      <div className="mt-7 flex gap-2">
        {Array.from({ length: 5 }).map((_, index) => (
          <Skeleton key={index} className="h-10 w-20 rounded-full" />
        ))}
      </div>
      <div className="mt-8 grid gap-5 md:grid-cols-2">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="rounded-2xl border p-6">
            <div className="flex items-center justify-between">
              <Skeleton className="h-6 w-32 rounded" />
              <Skeleton className="h-6 w-20 rounded-full" />
            </div>
            <Skeleton className="mt-6 h-16 w-full rounded-xl" />
            <Skeleton className="mt-6 h-2 w-full rounded-full" />
            <Skeleton className="mt-6 h-11 w-full rounded-xl" />
          </div>
        ))}
      </div>
    </div>
  );
}
