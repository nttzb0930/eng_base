function Skeleton({ className }: { className: string }) {
  return <div className={`bg-muted animate-pulse ${className}`} />;
}

export function ToeicDictationListSkeleton() {
  return (
    <div role="status" aria-busy="true" aria-label="Loading" className="mx-auto w-full max-w-[1000px] px-4 py-8 sm:px-6">
      <Skeleton className="h-5 w-52 rounded" />
      <Skeleton className="mt-7 h-10 w-80 rounded" />
      <Skeleton className="mt-3 h-4 w-full max-w-2xl rounded" />
      <div className="mt-7 flex gap-2"><Skeleton className="h-10 w-28 rounded-full" /><Skeleton className="h-10 w-28 rounded-full" /></div>
      <div className="mt-7 flex gap-2"><Skeleton className="h-10 w-20 rounded-full" /><Skeleton className="h-10 w-20 rounded-full" /><Skeleton className="h-10 w-20 rounded-full" /><Skeleton className="h-10 w-20 rounded-full" /></div>
      <div className="mt-8 grid gap-5 md:grid-cols-2">
        {Array.from({ length: 6 }).map((_, index) => <div key={index} className="rounded-2xl border p-6"><Skeleton className="h-6 w-32 rounded" /><Skeleton className="mt-3 h-8 w-48 rounded" /><Skeleton className="mt-7 h-2 w-full rounded-full" /><Skeleton className="mt-6 h-11 w-full rounded-xl" /></div>)}
      </div>
    </div>
  );
}
