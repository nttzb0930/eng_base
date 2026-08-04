"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import type {
  LeaderboardPeriod,
  LeaderboardResponse,
  LeaderboardUser,
} from "@repo/shared";
import {
  Trophy,
  Medal,
  CalendarDays,
  Calendar,
  Infinity as InfinityIcon,
  Flame,
  Gift,
  ArrowUp,
  ArrowDown,
  Minus,
  ChevronDown,
  Users,
  ListOrdered,
} from "lucide-react";

import { LeaderboardPageSkeleton } from "@/app/components/feedback/RouteSkeletons";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/app/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/components/ui/select";
import { useLeaderboard } from "@/app/features/leaderboard/hooks/use-leaderboard";
import { useUserProgress } from "@/app/features/progress/hooks/use-user-progress";
import { withLocale } from "@/app/i18n/paths";
import { useCurrentLocale } from "@/app/i18n/use-current-locale";

function isLeaderboardResponse(data: unknown): data is LeaderboardResponse {
  return typeof data === "object" && data !== null && "topUsers" in data;
}

export function LeaderboardView() {
  const t = useTranslations("leaderboard");
  const router = useRouter();
  const locale = useCurrentLocale();
  const [period, setPeriod] = useState<LeaderboardPeriod>("weekly");
  const [visibleCount, setVisibleCount] = useState<number>(10);

  const userProgressQuery = useUserProgress();
  const leaderboardQuery = useLeaderboard(period);

  const userProgress = userProgressQuery.data;
  const rawData = leaderboardQuery.data;
  const isLoading = userProgressQuery.isLoading || leaderboardQuery.isLoading;

  useEffect(() => {
    if (!isLoading && !userProgress?.activeCourse) {
      router.replace(withLocale("/courses", locale));
    }
  }, [isLoading, locale, router, userProgress?.activeCourse]);

  if (isLoading || !userProgress?.activeCourse) {
    return <LeaderboardPageSkeleton />;
  }

  let topUsers: LeaderboardUser[] = [];
  let seasonInfo = { seasonNumber: 1, daysRemaining: 30 };
  let currentUserRank = {
    rank: 1,
    totalLearners: 1,
    points: userProgress?.points ?? 0,
    nextRankPointsNeeded: 0,
    nextRankNumber: 1,
    percentileText: "Top 100%",
  };

  if (isLeaderboardResponse(rawData)) {
    topUsers = rawData.topUsers;
    seasonInfo = rawData.seasonInfo;
    currentUserRank = rawData.currentUserRank;
  } else if (Array.isArray(rawData)) {
    topUsers = rawData.map((u, idx) => ({
      ...u,
      rank: idx + 1,
      level: Math.max(1, Math.floor(u.points / 50) + 1),
    }));
    currentUserRank = {
      rank: 1,
      totalLearners: topUsers.length,
      points: userProgress?.points ?? 0,
      nextRankPointsNeeded: 0,
      nextRankNumber: 1,
      percentileText: "Top 100%",
    };
  }

  const nextPoints = currentUserRank.nextRankPointsNeeded ?? 0;
  const progressPct =
    currentUserRank.rank <= 1
      ? 100
      : nextPoints > 0
        ? Math.min(
            100,
            Math.max(
              10,
              Math.round(
                (currentUserRank.points /
                  (currentUserRank.points + nextPoints)) *
                  100
              )
            )
          )
        : 100;

  const top1 = topUsers[0];
  const top2 = topUsers[1];
  const top3 = topUsers[2];
  const remainingUsers = topUsers.slice(3, visibleCount);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-emerald-50/20 to-gray-100 px-4 py-8 [scrollbar-gutter:stable] sm:px-6">
      <div className="mx-auto max-w-4xl space-y-8">
        {/* Header Section */}
        <div className="space-y-3 text-center">
          <div className="shadow-xs inline-flex items-center gap-2 rounded-full border border-emerald-200/50 bg-emerald-100/80 px-4 py-1.5 text-sm font-semibold text-emerald-800">
            <Trophy className="h-4 w-4 text-emerald-600" />
            <span>
              {t("seasonSummary", {
                season: seasonInfo.seasonNumber,
                days: seasonInfo.daysRemaining,
              })}
            </span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 sm:text-4xl">
            {t("title")}
          </h1>
          <p className="mx-auto max-w-md text-base text-gray-500">
            {t("description")}
          </p>
        </div>

        {/* Time Period Filter Dropdown using Shadcn Select */}
        <div className="flex justify-center">
          <Select
            value={period}
            onValueChange={(val) => setPeriod(val as LeaderboardPeriod)}
          >
            <SelectTrigger className="w-[160px] rounded-2xl border-emerald-200/80 bg-white/90 font-bold text-gray-800 shadow-sm backdrop-blur-md transition-all hover:border-emerald-400 focus:ring-2 focus:ring-emerald-500/20 sm:w-[180px]">
              <div className="flex items-center gap-2 truncate">
                {period === "weekly" && (
                  <CalendarDays className="h-4 w-4 shrink-0 text-emerald-600" />
                )}
                {period === "monthly" && (
                  <Calendar className="h-4 w-4 shrink-0 text-emerald-600" />
                )}
                {period === "alltime" && (
                  <InfinityIcon className="h-4 w-4 shrink-0 text-emerald-600" />
                )}
                <SelectValue />
              </div>
            </SelectTrigger>
            <SelectContent
              align="center"
              sideOffset={4}
              className="rounded-2xl border-emerald-100 bg-white shadow-xl"
            >
              <SelectItem value="weekly" className="cursor-pointer font-medium">
                {t("periodWeekly")}
              </SelectItem>
              <SelectItem
                value="monthly"
                className="cursor-pointer font-medium"
              >
                {t("periodMonthly")}
              </SelectItem>
              <SelectItem
                value="alltime"
                className="cursor-pointer font-medium"
              >
                {t("periodAllTime")}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Podium - Top 3 */}
        {topUsers.length >= 3 && (
          <div className="pb-2 pt-6">
            <div className="mx-auto flex max-w-2xl items-end justify-center gap-3 sm:gap-6">
              {/* 2nd Place */}
              {top2 && (
                <div className="group max-w-[190px] flex-1 text-center">
                  <div className="relative mb-3 inline-block">
                    <Avatar className="mx-auto h-20 w-20 shadow-lg ring-4 ring-slate-300 transition-transform duration-300 group-hover:scale-105 sm:h-24 sm:w-24">
                      <AvatarImage
                        src={top2.userImageSrc}
                        className="object-cover"
                      />
                      <AvatarFallback className="bg-slate-200 text-xl font-bold text-slate-700">
                        {top2.userName.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="absolute -bottom-2 left-1/2 flex h-8 w-8 -translate-x-1/2 items-center justify-center rounded-full border-2 border-white bg-gradient-to-r from-slate-400 to-slate-500 text-sm font-extrabold text-white shadow-md">
                      2
                    </div>
                  </div>
                  <div className="truncate px-1 text-sm font-bold text-gray-800 sm:text-base">
                    {top2.userName}
                  </div>
                  <div className="text-xs font-semibold text-slate-600 sm:text-sm">
                    {t("points", { points: top2.points })}
                  </div>
                  <div className="mt-3 flex h-24 flex-col items-center justify-center rounded-t-2xl bg-gradient-to-b from-slate-300 via-slate-400 to-slate-500 text-white/90 shadow-md sm:h-32">
                    <Medal className="h-8 w-8 drop-shadow-md" />
                  </div>
                </div>
              )}

              {/* 1st Place */}
              {top1 && (
                <div className="group -mt-8 max-w-[210px] flex-1 text-center">
                  <div className="relative mb-3 inline-block">
                    <div className="absolute -top-7 left-1/2 -translate-x-1/2 animate-bounce text-3xl">
                      👑
                    </div>
                    <Avatar className="mx-auto h-24 w-24 shadow-xl ring-4 ring-amber-400 transition-transform duration-300 group-hover:scale-105 sm:h-28 sm:w-28">
                      <AvatarImage
                        src={top1.userImageSrc}
                        className="object-cover"
                      />
                      <AvatarFallback className="bg-amber-100 text-2xl font-bold text-amber-800">
                        {top1.userName.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="absolute -bottom-2 left-1/2 flex h-9 w-9 -translate-x-1/2 items-center justify-center rounded-full border-2 border-white bg-gradient-to-r from-amber-400 to-amber-600 text-base font-black text-white shadow-lg">
                      1
                    </div>
                  </div>
                  <div className="truncate px-1 text-base font-bold text-gray-900 sm:text-lg">
                    {top1.userName}
                  </div>
                  <div className="text-sm font-extrabold text-amber-600 sm:text-base">
                    {t("points", { points: top1.points })}
                  </div>
                  {top1.weeklyGain !== undefined && (
                    <div className="mt-0.5 text-xs font-medium text-emerald-600">
                      {t("todayGain", { points: top1.weeklyGain })}
                    </div>
                  )}
                  <div className="relative mt-3 flex h-32 flex-col items-center justify-center overflow-hidden rounded-t-2xl bg-gradient-to-b from-amber-400 via-amber-500 to-amber-600 text-white shadow-lg sm:h-40">
                    <Trophy className="relative z-10 h-10 w-10 drop-shadow-md" />
                  </div>
                </div>
              )}

              {/* 3rd Place */}
              {top3 && (
                <div className="group max-w-[190px] flex-1 text-center">
                  <div className="relative mb-3 inline-block">
                    <Avatar className="mx-auto h-20 w-20 shadow-lg ring-4 ring-amber-700/50 transition-transform duration-300 group-hover:scale-105 sm:h-24 sm:w-24">
                      <AvatarImage
                        src={top3.userImageSrc}
                        className="object-cover"
                      />
                      <AvatarFallback className="bg-orange-100 text-xl font-bold text-orange-800">
                        {top3.userName.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="absolute -bottom-2 left-1/2 flex h-8 w-8 -translate-x-1/2 items-center justify-center rounded-full border-2 border-white bg-gradient-to-r from-amber-600 to-orange-700 text-sm font-extrabold text-white shadow-md">
                      3
                    </div>
                  </div>
                  <div className="truncate px-1 text-sm font-bold text-gray-800 sm:text-base">
                    {top3.userName}
                  </div>
                  <div className="text-xs font-semibold text-amber-700 sm:text-sm">
                    {t("points", { points: top3.points })}
                  </div>
                  <div className="mt-3 flex h-20 flex-col items-center justify-center rounded-t-2xl bg-gradient-to-b from-amber-600 via-orange-600 to-amber-700 text-white/90 shadow-md sm:h-28">
                    <Medal className="h-7 w-7 drop-shadow-md" />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Current User Position Card */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 p-6 text-white shadow-xl shadow-emerald-900/10">
          <div className="pointer-events-none absolute -bottom-6 -right-6 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
          <div className="relative z-10 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div className="flex items-center gap-4">
              <Avatar className="h-14 w-14 border-2 border-white/40 bg-white/20 shadow-inner">
                <AvatarImage
                  src={userProgress?.userImageSrc}
                  className="object-cover"
                />
                <AvatarFallback className="bg-emerald-800 text-xl font-bold text-white">
                  {userProgress?.userName?.slice(0, 2)?.toUpperCase() ?? "U"}
                </AvatarFallback>
              </Avatar>
              <div>
                <div className="text-xs font-medium text-emerald-100 sm:text-sm">
                  {t("yourPosition")}
                </div>
                <div className="text-xl font-black sm:text-2xl">
                  {t("rankSummary", {
                    rank: currentUserRank.rank,
                    total: currentUserRank.totalLearners.toLocaleString(
                      locale === "vi" ? "vi-VN" : "en-US"
                    ),
                  })}
                </div>
              </div>
            </div>
            <div className="text-left sm:text-right">
              <div className="text-xs font-medium text-emerald-100 sm:text-sm">
                {t("yourXp")}
              </div>
              <div className="text-2xl font-black sm:text-3xl">
                {t("points", { points: currentUserRank.points })}
              </div>
            </div>
          </div>

          <div className="relative z-10 mt-5 space-y-1.5">
            <div className="backdrop-blur-xs h-2.5 w-full overflow-hidden rounded-full bg-black/20 p-0.5">
              <div
                className="h-full rounded-full bg-white transition-all duration-500"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <div className="flex justify-between text-xs font-medium text-emerald-100">
              <span>
                {currentUserRank.rank <= 1 ||
                currentUserRank.nextRankPointsNeeded === 0
                  ? t("atTopRank")
                  : t("nextRank", {
                      points: currentUserRank.nextRankPointsNeeded,
                      rank: currentUserRank.nextRankNumber,
                    })}
              </span>
              <span>{currentUserRank.percentileText}</span>
            </div>
          </div>
        </div>

        {/* Detailed Leaderboard List */}
        <div className="overflow-hidden rounded-3xl border border-gray-200/80 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50/50 p-5">
            <h3 className="flex items-center gap-2 text-base font-bold text-gray-800 sm:text-lg">
              <ListOrdered className="h-5 w-5 text-emerald-600" />
              {t("detailsTitle")}
            </h3>
            <div className="flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-medium text-gray-500 sm:text-sm">
              <Users className="h-4 w-4 text-gray-400" />
              <span>
                {t("participants", {
                  count: currentUserRank.totalLearners.toLocaleString(
                    locale === "vi" ? "vi-VN" : "en-US"
                  ),
                })}
              </span>
            </div>
          </div>

          <div className="divide-y divide-gray-100">
            {remainingUsers.map((user) => {
              const isCurrentUser = user.userId === userProgress?.userId;
              return (
                <div
                  key={user.userId}
                  className={`flex items-center gap-3 px-4 py-4 transition-all duration-200 hover:bg-emerald-50/40 sm:gap-4 sm:px-6 ${
                    isCurrentUser
                      ? "border-l-4 border-emerald-500 bg-emerald-50/80 font-medium"
                      : ""
                  }`}
                >
                  <div className="w-7 text-center text-sm font-bold text-gray-500 sm:text-base">
                    {user.rank}
                  </div>
                  <Avatar className="shadow-xs h-10 w-10 border border-gray-200 sm:h-11 sm:w-11">
                    <AvatarImage
                      src={user.userImageSrc}
                      className="object-cover"
                    />
                    <AvatarFallback className="bg-gradient-to-br from-emerald-400 to-teal-600 text-sm font-bold text-white">
                      {user.userName.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 truncate text-sm font-semibold text-gray-900 sm:text-base">
                      <span>{user.userName}</span>
                      {isCurrentUser && (
                        <span className="rounded-full bg-emerald-500 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
                          {t("you")}
                        </span>
                      )}
                    </div>
                    <div className="mt-0.5 flex items-center gap-2 text-xs text-gray-500">
                      {user.level !== undefined && (
                        <span>{t("level", { level: user.level })}</span>
                      )}
                      {user.streak !== undefined && (
                        <>
                          {user.level !== undefined && <span>•</span>}
                          <span className="flex items-center gap-1 font-medium text-orange-600">
                            <Flame className="h-3.5 w-3.5 fill-orange-500 text-orange-500" />
                            {t("streakDays", { count: user.streak })}
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-sm font-bold text-gray-900 sm:text-base">
                      {t("points", { points: user.points })}
                    </div>
                    {user.trend === "up" && (
                      <div className="flex items-center justify-end gap-0.5 text-xs font-semibold text-emerald-600">
                        <ArrowUp className="h-3.5 w-3.5" />
                        <span>+{user.trendValue ?? 12}</span>
                      </div>
                    )}
                    {user.trend === "down" && (
                      <div className="flex items-center justify-end gap-0.5 text-xs font-semibold text-rose-500">
                        <ArrowDown className="h-3.5 w-3.5" />
                        <span>-{user.trendValue ?? 2}</span>
                      </div>
                    )}
                    {user.trend === "neutral" && (
                      <div className="flex items-center justify-end gap-0.5 text-xs font-semibold text-gray-400">
                        <Minus className="h-3.5 w-3.5" />
                        <span>0</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {topUsers.length > visibleCount && (
            <div className="border-t border-gray-100 bg-gray-50/30 p-4 text-center">
              <button
                type="button"
                onClick={() => setVisibleCount((prev) => prev + 10)}
                className="inline-flex items-center gap-2 rounded-xl px-4 py-1 text-sm font-semibold text-emerald-600 transition-colors hover:bg-emerald-50 hover:text-emerald-700"
              >
                <ChevronDown className="h-4 w-4" />
                <span>
                  {t("loadMore", { count: topUsers.length - visibleCount })}
                </span>
              </button>
            </div>
          )}
        </div>

        {/* Season Rewards Section */}
        <div className="shadow-xs rounded-3xl border border-amber-200/80 bg-gradient-to-br from-amber-50/80 via-orange-50/50 to-amber-100/50 p-6">
          <h3 className="mb-4 flex items-center gap-2 text-base font-bold text-gray-900 sm:text-lg">
            <Gift className="h-5 w-5 text-amber-500" />
            {t("seasonRewards")}
          </h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
            <div className="backdrop-blur-xs shadow-xs rounded-2xl border border-amber-100 bg-white/90 p-4 text-center transition-transform hover:-translate-y-0.5">
              <div className="mb-2 text-3xl">🥇</div>
              <div className="text-sm font-bold text-gray-900">
                {t("rankFirst")}
              </div>
              <div className="mt-1 text-xs font-medium text-amber-700">
                {t("rewardGold")}
              </div>
            </div>
            <div className="backdrop-blur-xs shadow-xs rounded-2xl border border-slate-100 bg-white/90 p-4 text-center transition-transform hover:-translate-y-0.5">
              <div className="mb-2 text-3xl">🥈</div>
              <div className="text-sm font-bold text-gray-900">
                {t("rankSecondThird")}
              </div>
              <div className="mt-1 text-xs font-medium text-slate-600">
                {t("rewardSilver")}
              </div>
            </div>
            <div className="backdrop-blur-xs shadow-xs rounded-2xl border border-orange-100 bg-white/90 p-4 text-center transition-transform hover:-translate-y-0.5">
              <div className="mb-2 text-3xl">🥉</div>
              <div className="text-sm font-bold text-gray-900">
                {t("rankFourthTenth")}
              </div>
              <div className="mt-1 text-xs font-medium text-orange-700">
                {t("rewardBronze")}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
