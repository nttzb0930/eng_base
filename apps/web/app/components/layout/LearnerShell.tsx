"use client";

import { Header } from "@/app/components/navigation/Header";
import { MobileHeader } from "@/app/components/navigation/MobileHeader";
import { ScrollToTopButton } from "@/app/components/navigation/ScrollToTopButton";
import { ListPageSkeleton, SessionPageSkeleton } from "@/app/components/feedback/RouteSkeletons";
import { useAuth } from "@/app/features/auth/hooks/use-auth";
import { PlacementConfirmationGuard } from "@/app/features/placement-test/components/PlacementConfirmationGuard";
import { useUserProgress } from "@/app/features/progress/hooks/use-user-progress";

type LearnerShellProps = {
  children: React.ReactNode;
  mode?: "main" | "session";
};

export function LearnerShell({ children, mode = "main" }: LearnerShellProps) {
  const { status } = useAuth();
  const progressQuery = useUserProgress(status === "authenticated");
  const fallback = mode === "session" ? <SessionPageSkeleton embedded /> : <ListPageSkeleton />;

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
    return <div className="flex h-dvh min-h-0 w-full flex-col overflow-hidden">{children}</div>;
  }

  return (
    <>
      <MobileHeader />
      <Header className="hidden lg:flex" />
      <main id="main-content" className="min-h-dvh pt-16 lg:pt-[68px]">
        <div className="app-container py-6 sm:py-8 lg:py-10">{children}</div>
      </main>
      <ScrollToTopButton />
    </>
  );
}
