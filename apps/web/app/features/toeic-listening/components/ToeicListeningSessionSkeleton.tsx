import { ToeicListeningListSkeleton } from "./ToeicListeningListSkeleton";

export function ToeicListeningSessionSkeleton() {
  return (
    <main className="bg-background min-h-dvh" role="status" aria-busy="true">
      <div className="border-b px-6 py-5">
        <div className="bg-muted h-3 animate-pulse rounded-full" />
      </div>
      <div className="mx-auto max-w-[1280px] px-4 py-7 sm:px-6">
        <ToeicListeningListSkeleton />
      </div>
    </main>
  );
}
