"use client";

import { useEffect } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

import { ListPageSkeleton } from "@/app/components/feedback/RouteSkeletons";
import { FeedWrapper } from "@/app/components/layout/FeedWrapper";
import { Avatar, AvatarImage } from "@/app/components/ui/avatar";
import { Separator } from "@/app/components/ui/separator";
import { useLeaderboard } from "@/app/features/leaderboard/hooks/use-leaderboard";
import { useUserProgress } from "@/app/features/progress/hooks/use-user-progress";
import { withLocale } from "@/app/i18n/paths";
import { useCurrentLocale } from "@/app/i18n/use-current-locale";

export function LeaderboardView() {
  const t = useTranslations("leaderboard");
  const router = useRouter();
  const locale = useCurrentLocale();
  const userProgressQuery = useUserProgress();
  const leaderboardQuery = useLeaderboard();

  const userProgress = userProgressQuery.data;
  const leaderboard = leaderboardQuery.data ?? [];
  const isLoading = userProgressQuery.isLoading || leaderboardQuery.isLoading;

  useEffect(() => {
    if (!isLoading && !userProgress?.activeCourse) {
      router.replace(withLocale("/courses", locale));
    }
  }, [isLoading, locale, router, userProgress?.activeCourse]);

  if (isLoading || !userProgress?.activeCourse) {
    return <ListPageSkeleton />;
  }

  return (
    <div className="flex justify-center px-6 w-full">
      <div className="w-full max-w-[672px]">
        <FeedWrapper>
          <div className="flex w-full flex-col items-center">
            <Image
              src="/leaderboard.svg"
              alt={t("title")}
              height={90}
              width={90}
            />

            <h1 className="my-6 text-center text-2xl font-bold text-neutral-800">
              {t("title")}
            </h1>
            <p className="mb-6 text-center text-lg text-muted-foreground">
              {t("description")}
            </p>

            <Separator className="mb-4 h-0.5 rounded-full" />
            {leaderboard.map((userProgress, i) => (
              <div
                key={userProgress.userId}
                className="flex w-full items-center rounded-xl p-2 px-4 hover:bg-gray-200/50"
              >
                <p className="mr-4 font-bold text-lime-700">{i + 1}</p>

                <Avatar className="ml-3 mr-6 h-12 w-12 border bg-green-500">
                  <AvatarImage
                    src={userProgress.userImageSrc}
                    className="object-cover"
                  />
                </Avatar>

                <p className="flex-1 font-bold text-neutral-800">
                  {userProgress.userName}
                </p>
                <p className="text-muted-foreground">{userProgress.points} XP</p>
              </div>
            ))}
          </div>
        </FeedWrapper>
      </div>
    </div>
  );
}
