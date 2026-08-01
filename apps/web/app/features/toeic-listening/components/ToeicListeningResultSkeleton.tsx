export function ToeicListeningResultSkeleton() {
  return (
    <main
      className="bg-background min-h-dvh px-4 py-8 sm:px-6"
      role="status"
      aria-busy="true"
    >
      <div className="mx-auto max-w-4xl">
        <div className="bg-muted h-5 w-48 animate-pulse rounded" />
        <div className="mt-6 rounded-2xl border p-8">
          <div className="bg-muted h-8 w-72 animate-pulse rounded" />
          <div className="bg-muted mt-7 h-14 w-40 animate-pulse rounded" />
        </div>
        <div className="mt-8 space-y-4">
          {Array.from({ length: 3 }).map((_, index) => (
            <div
              key={index}
              className="h-60 animate-pulse rounded-2xl border"
            />
          ))}
        </div>
      </div>
    </main>
  );
}
