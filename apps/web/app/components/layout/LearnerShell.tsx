"use client";

import { Header } from "@/app/components/navigation/Header";
import { MobileHeader } from "@/app/components/navigation/MobileHeader";
import { ScrollToTopButton } from "@/app/components/navigation/ScrollToTopButton";
import {
  CoursesPageSkeleton,
  DashboardPageSkeleton,
  FlashcardsPageSkeleton,
  LeaderboardPageSkeleton,
  LearnLevelPageSkeleton,
  LearnPageSkeleton,
  PracticePageSkeleton,
  ReadingListPageSkeleton,
  SavedWordsPageSkeleton,
  SessionPageSkeleton,
  TopicDetailPageSkeleton,
  TopicsPageSkeleton,
} from "@/app/components/feedback/RouteSkeletons";
import { useAuth } from "@/app/features/auth/hooks/use-auth";
import { PlacementConfirmationGuard } from "@/app/features/placement-test/components/PlacementConfirmationGuard";
import { useUserProgress } from "@/app/features/progress/hooks/use-user-progress";
import { usePathname } from "next/navigation";

type LearnerShellProps = {
  children: React.ReactNode;
  mode?: "main" | "session";
};

function MainShellFallback() {
  const pathname = usePathname();

  return (
    <>
      <MobileHeader />
      <Header className="hidden lg:flex" />
      <main id="main-content" className="min-h-dvh min-w-0">
        <div className="app-container py-6 sm:py-8 lg:py-10">
          {getMainPageSkeleton(pathname)}
        </div>
      </main>
      <ScrollToTopButton />
    </>
  );
}

function getMainPageSkeleton(pathname: string) {
  if (/(?:^|\/)dashboard(?:\/|$)/u.test(pathname))
    return <DashboardPageSkeleton />;
  if (/(?:^|\/)courses(?:\/|$)/u.test(pathname)) return <CoursesPageSkeleton />;
  if (/(?:^|\/)flashcards(?:\/|$)/u.test(pathname))
    return <FlashcardsPageSkeleton />;
  if (/(?:^|\/)leaderboard(?:\/|$)/u.test(pathname))
    return <LeaderboardPageSkeleton />;
  if (/(?:^|\/)learn\/level(?:\/|$)/u.test(pathname))
    return <LearnLevelPageSkeleton />;
  if (/(?:^|\/)learn(?:\/|$)/u.test(pathname)) return <LearnPageSkeleton />;
  if (/(?:^|\/)practice(?:\/|$)/u.test(pathname))
    return <PracticePageSkeleton />;
  if (/(?:^|\/)reading(?:\/|$)/u.test(pathname))
    return <ReadingListPageSkeleton />;
  if (/(?:^|\/)saved-words(?:\/|$)/u.test(pathname))
    return <SavedWordsPageSkeleton />;
  if (/(?:^|\/)topics\/[^/]+(?:\/|$)/u.test(pathname))
    return <TopicDetailPageSkeleton />;
  if (/(?:^|\/)topics(?:\/|$)/u.test(pathname)) return <TopicsPageSkeleton />;
  return <LearnPageSkeleton />;
}

export function LearnerShell({ children, mode = "main" }: LearnerShellProps) {
  const { status } = useAuth();
  const progressQuery = useUserProgress(status === "authenticated");
  const fallback =
    mode === "session" ? (
      <SessionPageSkeleton embedded />
    ) : (
      <MainShellFallback />
    );

  if (status !== "authenticated" || progressQuery.isLoading) return fallback;

  const userProgress = progressQuery.data;
  if (userProgress && !userProgress.isPlacementTestConfirmed) {
    return (
      <PlacementConfirmationGuard isConfirmed={false} fallback={fallback}>
        {children}
      </PlacementConfirmationGuard>
    );
  }

  if (mode === "session") {
    return (
      <div className="flex h-dvh min-h-0 w-full flex-col overflow-y-auto overflow-x-hidden [scrollbar-gutter:stable]">
        {children}
      </div>
    );
  }

  return (
    <>
      <MobileHeader />
      <Header className="hidden lg:flex" />
      <main id="main-content" className="min-h-dvh min-w-0">
        <div className="app-container py-6 sm:py-8 lg:py-10">{children}</div>
      </main>
      <ScrollToTopButton />
    </>
  );
}
