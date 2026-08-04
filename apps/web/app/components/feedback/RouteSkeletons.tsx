import { cn } from "@/app/utils/cn";

type SkeletonProps = React.HTMLAttributes<HTMLDivElement>;

function Skeleton({ className, ...props }: SkeletonProps) {
  return (
    <div
      className={cn("bg-muted animate-pulse rounded-lg", className)}
      aria-hidden="true"
      {...props}
    />
  );
}

function LoadingFrame({ children }: { children: React.ReactNode }) {
  return (
    <div role="status" aria-busy="true" aria-label="Loading" className="pb-12">
      {children}
      <span className="sr-only">Loading</span>
    </div>
  );
}

function HeaderSkeleton() {
  return (
    <div className="mb-7 max-w-2xl space-y-3">
      <Skeleton className="h-3 w-24" />
      <Skeleton className="h-10 w-3/4 max-w-md" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-4/5" />
    </div>
  );
}

function HeroSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("bg-primary/12 rounded-lg p-6 sm:p-8", className)}>
      <Skeleton className="bg-primary/15 h-7 w-32" />
      <Skeleton className="bg-primary/15 mt-5 h-8 w-1/2" />
      <Skeleton className="bg-primary/15 mt-3 h-4 w-3/4" />
      <div className="mt-6 flex items-center gap-3">
        <Skeleton className="bg-primary/15 h-11 w-32" />
        <Skeleton className="bg-primary/15 h-4 w-28" />
      </div>
    </div>
  );
}

function CardSkeleton({ compact = false }: { compact?: boolean }) {
  return (
    <div className="bg-card rounded-2xl border p-5">
      <div className="flex items-start justify-between">
        <Skeleton className="h-10 w-10" />
        <Skeleton className="h-5 w-12" />
      </div>
      <Skeleton className="mt-5 h-5 w-2/3" />
      <Skeleton className="mt-2 h-4 w-full" />
      {!compact && <Skeleton className="mt-2 h-4 w-4/5" />}
      <Skeleton className="mt-5 h-2 w-full rounded-full" />
    </div>
  );
}

export function DiscoveryPageSkeleton() {
  return (
    <LoadingFrame>
      <HeaderSkeleton />
      <Skeleton className="mb-7 h-12 w-64" />
      <HeroSkeleton />
      <Skeleton className="mb-4 mt-8 h-4 w-32" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <CardSkeleton key={index} />
        ))}
      </div>
    </LoadingFrame>
  );
}

export function LearnPageSkeleton() {
  return (
    <LoadingFrame>
      <HeaderSkeleton />
      <HeroSkeleton className="rounded-2xl" />
      <Skeleton className="mb-4 mt-9 h-4 w-36" />
      <div className="grid gap-5 md:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <Skeleton key={index} className="bg-card h-80 rounded-2xl border" />
        ))}
      </div>
      <Skeleton className="mb-4 mt-10 h-4 w-40" />
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="bg-card h-32 rounded-2xl border" />
        ))}
      </div>
    </LoadingFrame>
  );
}

export function LearnLevelPageSkeleton() {
  return (
    <LoadingFrame>
      <HeaderSkeleton />
      <Skeleton className="mb-7 h-12 w-64" />
      <Skeleton className="mb-4 mt-6 h-4 w-48" />
      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton
            key={index}
            className="bg-card h-[185px] rounded-2xl border"
          />
        ))}
      </div>
      <Skeleton className="mb-4 mt-10 h-4 w-44" />
      <Skeleton className="bg-card h-28 rounded-2xl border" />
    </LoadingFrame>
  );
}

export function CoursesPageSkeleton() {
  return (
    <LoadingFrame>
      <HeaderSkeleton />
      <Skeleton className="mb-7 h-12 w-64" />
      <Skeleton className="mb-4 mt-4 h-4 w-32" />
      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 5 }).map((_, index) => (
          <Skeleton
            key={index}
            className="bg-card h-[175px] rounded-2xl border"
          />
        ))}
      </div>
    </LoadingFrame>
  );
}

export function TopicsPageSkeleton() {
  return (
    <LoadingFrame>
      <HeaderSkeleton />
      <Skeleton className="mb-7 h-12 w-64" />
      <HeroSkeleton />
      <Skeleton className="mb-4 mt-8 h-4 w-36" />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <CardSkeleton key={index} compact />
        ))}
      </div>
    </LoadingFrame>
  );
}

export function TopicDetailPageSkeleton() {
  return (
    <LoadingFrame>
      <Skeleton className="mb-6 h-5 w-72" />
      <Skeleton className="bg-card h-48 rounded-2xl border" />
      <div className="mt-7 grid gap-4 md:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <Skeleton key={index} className="bg-card h-20 rounded-xl border" />
        ))}
      </div>
      <div className="mt-6 flex flex-wrap gap-2">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton
            key={index}
            className="bg-card h-9 w-28 rounded-xl border"
          />
        ))}
      </div>
      <Skeleton className="bg-card mt-6 h-96 rounded-2xl border" />
    </LoadingFrame>
  );
}

export function PracticePageSkeleton() {
  return (
    <LoadingFrame>
      <HeaderSkeleton />
      <HeroSkeleton />
      <Skeleton className="mb-4 mt-9 h-7 w-64" />
      <div className="grid gap-4 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <CardSkeleton key={index} />
        ))}
      </div>
      <Skeleton className="mb-4 mt-9 h-7 w-48" />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        {Array.from({ length: 5 }).map((_, index) => (
          <Skeleton key={index} className="h-28 rounded-2xl border" />
        ))}
      </div>
      <Skeleton className="mt-9 h-24 w-full rounded-2xl border" />
    </LoadingFrame>
  );
}

export function FlashcardsPageSkeleton() {
  return (
    <LoadingFrame>
      <HeaderSkeleton />
      <div className="mb-9 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="bg-card h-44 rounded-2xl border" />
        ))}
      </div>
      <HeroSkeleton className="rounded-2xl" />
      <Skeleton className="mb-4 mt-10 h-6 w-40" />
      <div className="grid gap-4 sm:grid-cols-2">
        {Array.from({ length: 2 }).map((_, index) => (
          <Skeleton key={index} className="bg-card h-80 rounded-2xl border" />
        ))}
      </div>
      <Skeleton className="mb-4 mt-10 h-6 w-40" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton
            key={index}
            className="bg-card h-[165px] rounded-2xl border"
          />
        ))}
      </div>
    </LoadingFrame>
  );
}

export function DashboardPageSkeleton() {
  return (
    <LoadingFrame>
      <HeaderSkeleton />
      <HeroSkeleton />
      <div className="mt-5 grid gap-4 md:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <CardSkeleton key={index} compact />
        ))}
      </div>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <CardSkeleton key={index} />
        ))}
      </div>
      <div className="mt-6 grid gap-4 lg:grid-cols-[1.35fr_1fr]">
        <Skeleton className="h-72 rounded-2xl border" />
        <Skeleton className="h-72 rounded-2xl border" />
      </div>
    </LoadingFrame>
  );
}

export function ListPageSkeleton({ cards = 6 }: { cards?: number }) {
  return (
    <LoadingFrame>
      <HeaderSkeleton />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: cards }).map((_, index) => (
          <CardSkeleton key={index} compact />
        ))}
      </div>
    </LoadingFrame>
  );
}

export function SavedWordsPageSkeleton() {
  return (
    <LoadingFrame>
      <HeaderSkeleton />
      <HeroSkeleton className="h-52 rounded-3xl" />
      <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, index) => (
          <Skeleton key={index} className="h-20 rounded-2xl border" />
        ))}
      </div>
      <Skeleton className="mt-6 h-20 w-full rounded-2xl border" />
      <div className="mt-4 space-y-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <div
            key={index}
            className="bg-card flex items-center gap-4 rounded-2xl border p-4"
          >
            <Skeleton className="h-10 w-10 shrink-0 rounded-xl" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-3 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
            <Skeleton className="h-8 w-20" />
          </div>
        ))}
      </div>
    </LoadingFrame>
  );
}

export function LeaderboardPageSkeleton() {
  return (
    <LoadingFrame>
      <HeaderSkeleton />
      <div className="surface-panel divide-y overflow-hidden p-2">
        {Array.from({ length: 8 }).map((_, index) => (
          <div key={index} className="flex items-center gap-4 px-3 py-4">
            <Skeleton className="h-6 w-6" />
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-3 w-24" />
            </div>
            <Skeleton className="h-5 w-16" />
          </div>
        ))}
      </div>
    </LoadingFrame>
  );
}

export function ReadingListPageSkeleton() {
  return (
    <LoadingFrame>
      <HeaderSkeleton />
      <div className="mt-8 grid gap-4 md:grid-cols-2">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="bg-card rounded-2xl border p-6">
            <div className="flex justify-between">
              <Skeleton className="h-6 w-12 rounded-full" />
              <Skeleton className="h-4 w-24" />
            </div>
            <Skeleton className="mt-6 h-7 w-2/3" />
            <Skeleton className="mt-3 h-4 w-4/5" />
            <Skeleton className="mt-8 h-5 w-28" />
          </div>
        ))}
      </div>
    </LoadingFrame>
  );
}

export function ReadingSessionPageSkeleton() {
  return (
    <LoadingFrame>
      <div className="mx-auto grid max-w-6xl gap-7 px-4 py-8 sm:px-6 lg:grid-cols-[minmax(0,1fr)_250px]">
        <div>
          <div className="bg-card rounded-2xl border p-8">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="mt-4 h-10 w-2/3" />
            <div className="mt-8 space-y-4">
              {Array.from({ length: 7 }).map((_, index) => (
                <Skeleton
                  key={index}
                  className={cn("h-4", index % 3 === 2 ? "w-4/5" : "w-full")}
                />
              ))}
            </div>
          </div>
          <Skeleton className="mt-8 h-64 rounded-2xl border" />
        </div>
        <Skeleton className="order-first h-56 rounded-2xl border lg:order-last" />
      </div>
    </LoadingFrame>
  );
}

export function ReadingResultPageSkeleton() {
  return (
    <LoadingFrame>
      <div className="mx-auto max-w-3xl space-y-6 px-4 py-8">
        <div className="bg-card rounded-2xl border p-8">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="mt-4 h-9 w-3/4" />
          <Skeleton className="mt-8 h-16 w-28" />
        </div>
        {Array.from({ length: 3 }).map((_, index) => (
          <Skeleton key={index} className="h-52 rounded-2xl border" />
        ))}
      </div>
    </LoadingFrame>
  );
}

export function SessionPageSkeleton({
  embedded = false,
}: {
  embedded?: boolean;
}) {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="Loading"
      className={cn(
        "flex min-h-0 flex-col overflow-hidden",
        embedded ? "h-[calc(100dvh-8rem)] min-h-[32rem]" : "h-dvh"
      )}
    >
      <div className="flex shrink-0 items-center gap-5 border-b px-4 py-5 sm:px-8">
        <Skeleton className="h-9 w-9" />
        <Skeleton className="h-3 flex-1 rounded-full" />
        <Skeleton className="h-6 w-12" />
      </div>
      <div className="min-h-0 flex-1 overflow-hidden px-4 py-8 sm:px-6">
        <div className="mx-auto max-w-[680px] space-y-8">
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-24 w-full rounded-2xl" />
          <div className="grid grid-cols-2 gap-3">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-20 rounded-xl border" />
            ))}
          </div>
        </div>
      </div>
      <div className="flex min-h-24 shrink-0 items-center justify-end border-t px-4 py-4 sm:px-8">
        <Skeleton className="h-11 w-32" />
      </div>
      <span className="sr-only">Loading</span>
    </div>
  );
}
