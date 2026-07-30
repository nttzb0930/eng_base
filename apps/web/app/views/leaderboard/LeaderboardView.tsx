"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import type { LeaderboardPeriod, LeaderboardResponse, LeaderboardUser } from "@repo/shared";
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
import { Avatar, AvatarFallback, AvatarImage } from "@/app/components/ui/avatar";
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
  let seasonInfo = { seasonNumber: 12, daysRemaining: 5 };
  let currentUserRank = {
    rank: 15,
    totalLearners: 2847,
    points: userProgress?.points ?? 185,
    nextRankPointsNeeded: 35,
    nextRankNumber: 12,
    percentileText: "Top 1%",
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
      streak: ((idx * 3 + 2) % 7) + 1,
      weeklyGain: Math.floor(u.points * 0.15),
      trend: idx % 3 === 0 ? "up" : idx % 3 === 1 ? "neutral" : "down",
      trendValue: idx % 3 === 0 ? 5 : idx % 3 === 2 ? 2 : 0,
    }));
  }

  const top1 = topUsers[0];
  const top2 = topUsers[1];
  const top3 = topUsers[2];
  const remainingUsers = topUsers.slice(3, visibleCount);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-emerald-50/20 to-gray-100 py-8 px-4 sm:px-6">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header Section */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 bg-emerald-100/80 text-emerald-800 px-4 py-1.5 rounded-full text-sm font-semibold border border-emerald-200/50 shadow-xs">
            <Trophy className="w-4 h-4 text-emerald-600" />
            <span>
              {t("seasonSummary", {
                season: seasonInfo.seasonNumber,
                days: seasonInfo.daysRemaining,
              })}
            </span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight">
            {t("title")}
          </h1>
          <p className="text-gray-500 text-base max-w-md mx-auto">
            {t("description")}
          </p>
        </div>

        {/* Time Period Filter */}
        <div className="flex justify-center">
          <div className="bg-white/80 backdrop-blur-md rounded-2xl p-1.5 shadow-sm border border-gray-200 flex gap-1">
            <button
              type="button"
              onClick={() => setPeriod("weekly")}
              className={`px-5 py-2 rounded-xl text-sm font-semibold transition-all duration-200 flex items-center gap-2 ${
                period === "weekly"
                  ? "bg-emerald-500 text-white shadow-md shadow-emerald-500/20 scale-[1.02]"
                  : "text-gray-600 hover:bg-gray-100/80"
              }`}
            >
              <CalendarDays className="w-4 h-4" />
              {t("periodWeekly")}
            </button>
            <button
              type="button"
              onClick={() => setPeriod("monthly")}
              className={`px-5 py-2 rounded-xl text-sm font-semibold transition-all duration-200 flex items-center gap-2 ${
                period === "monthly"
                  ? "bg-emerald-500 text-white shadow-md shadow-emerald-500/20 scale-[1.02]"
                  : "text-gray-600 hover:bg-gray-100/80"
              }`}
            >
              <Calendar className="w-4 h-4" />
              {t("periodMonthly")}
            </button>
            <button
              type="button"
              onClick={() => setPeriod("alltime")}
              className={`px-5 py-2 rounded-xl text-sm font-semibold transition-all duration-200 flex items-center gap-2 ${
                period === "alltime"
                  ? "bg-emerald-500 text-white shadow-md shadow-emerald-500/20 scale-[1.02]"
                  : "text-gray-600 hover:bg-gray-100/80"
              }`}
            >
              <InfinityIcon className="w-4 h-4" />
              {t("periodAllTime")}
            </button>
          </div>
        </div>

        {/* Podium - Top 3 */}
        {topUsers.length >= 3 && (
          <div className="pt-6 pb-2">
            <div className="flex items-end justify-center gap-3 sm:gap-6 max-w-2xl mx-auto">
              {/* 2nd Place */}
              {top2 && (
                <div className="flex-1 max-w-[190px] text-center group">
                  <div className="relative inline-block mb-3">
                    <Avatar className="w-20 h-20 sm:w-24 sm:h-24 ring-4 ring-slate-300 shadow-lg mx-auto transition-transform duration-300 group-hover:scale-105">
                      <AvatarImage src={top2.userImageSrc} className="object-cover" />
                      <AvatarFallback className="bg-slate-200 font-bold text-slate-700 text-xl">
                        {top2.userName.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-gradient-to-r from-slate-400 to-slate-500 text-white w-8 h-8 rounded-full flex items-center justify-center font-extrabold text-sm shadow-md border-2 border-white">
                      2
                    </div>
                  </div>
                  <div className="font-bold text-gray-800 text-sm sm:text-base truncate px-1">
                    {top2.userName}
                  </div>
                  <div className="text-slate-600 font-semibold text-xs sm:text-sm">
                    {t("points", { points: top2.points })}
                  </div>
                  <div className="mt-3 bg-gradient-to-b from-slate-300 via-slate-400 to-slate-500 h-24 sm:h-32 rounded-t-2xl flex flex-col items-center justify-center text-white/90 shadow-md">
                    <Medal className="w-8 h-8 drop-shadow-md" />
                  </div>
                </div>
              )}

              {/* 1st Place */}
              {top1 && (
                <div className="flex-1 max-w-[210px] text-center -mt-8 group">
                  <div className="relative inline-block mb-3">
                    <div className="absolute -top-7 left-1/2 -translate-x-1/2 text-3xl animate-bounce">
                      👑
                    </div>
                    <Avatar className="w-24 h-24 sm:w-28 sm:h-28 ring-4 ring-amber-400 shadow-xl mx-auto transition-transform duration-300 group-hover:scale-105">
                      <AvatarImage src={top1.userImageSrc} className="object-cover" />
                      <AvatarFallback className="bg-amber-100 font-bold text-amber-800 text-2xl">
                        {top1.userName.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-gradient-to-r from-amber-400 to-amber-600 text-white w-9 h-9 rounded-full flex items-center justify-center font-black text-base shadow-lg border-2 border-white">
                      1
                    </div>
                  </div>
                  <div className="font-bold text-gray-900 text-base sm:text-lg truncate px-1">
                    {top1.userName}
                  </div>
                  <div className="text-amber-600 font-extrabold text-sm sm:text-base">
                    {t("points", { points: top1.points })}
                  </div>
                  <div className="text-xs text-emerald-600 font-medium mt-0.5">
                    {t("todayGain", { points: top1.weeklyGain ?? 45 })}
                  </div>
                  <div className="mt-3 bg-gradient-to-b from-amber-400 via-amber-500 to-amber-600 h-32 sm:h-40 rounded-t-2xl flex flex-col items-center justify-center text-white shadow-lg relative overflow-hidden">
                    <Trophy className="w-10 h-10 drop-shadow-md relative z-10" />
                  </div>
                </div>
              )}

              {/* 3rd Place */}
              {top3 && (
                <div className="flex-1 max-w-[190px] text-center group">
                  <div className="relative inline-block mb-3">
                    <Avatar className="w-20 h-20 sm:w-24 sm:h-24 ring-4 ring-amber-700/50 shadow-lg mx-auto transition-transform duration-300 group-hover:scale-105">
                      <AvatarImage src={top3.userImageSrc} className="object-cover" />
                      <AvatarFallback className="bg-orange-100 font-bold text-orange-800 text-xl">
                        {top3.userName.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-gradient-to-r from-amber-600 to-orange-700 text-white w-8 h-8 rounded-full flex items-center justify-center font-extrabold text-sm shadow-md border-2 border-white">
                      3
                    </div>
                  </div>
                  <div className="font-bold text-gray-800 text-sm sm:text-base truncate px-1">
                    {top3.userName}
                  </div>
                  <div className="text-amber-700 font-semibold text-xs sm:text-sm">
                    {t("points", { points: top3.points })}
                  </div>
                  <div className="mt-3 bg-gradient-to-b from-amber-600 via-orange-600 to-amber-700 h-20 sm:h-28 rounded-t-2xl flex flex-col items-center justify-center text-white/90 shadow-md">
                    <Medal className="w-7 h-7 drop-shadow-md" />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Current User Position Card */}
        <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 rounded-3xl p-6 text-white shadow-xl shadow-emerald-900/10 relative overflow-hidden">
          <div className="absolute -right-6 -bottom-6 w-32 h-32 bg-white/10 rounded-full blur-2xl pointer-events-none" />
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
            <div className="flex items-center gap-4">
              <Avatar className="w-14 h-14 border-2 border-white/40 shadow-inner bg-white/20">
                <AvatarImage src={userProgress?.userImageSrc} className="object-cover" />
                <AvatarFallback className="font-bold text-white text-xl bg-emerald-800">
                  {userProgress?.userName?.slice(0, 2)?.toUpperCase() ?? "N"}
                </AvatarFallback>
              </Avatar>
              <div>
                <div className="text-emerald-100 text-xs sm:text-sm font-medium">
                  {t("yourPosition")}
                </div>
                <div className="text-xl sm:text-2xl font-black">
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
              <div className="text-emerald-100 text-xs sm:text-sm font-medium">
                {t("yourXp")}
              </div>
              <div className="text-2xl sm:text-3xl font-black">
                {t("points", { points: currentUserRank.points })}
              </div>
            </div>
          </div>

          <div className="mt-5 space-y-1.5 relative z-10">
            <div className="w-full bg-black/20 rounded-full h-2.5 overflow-hidden backdrop-blur-xs p-0.5">
              <div
                className="bg-white h-full rounded-full transition-all duration-500"
                style={{ width: "65%" }}
              />
            </div>
            <div className="flex justify-between text-xs text-emerald-100 font-medium">
              <span>
                {t("nextRank", {
                  points: currentUserRank.nextRankPointsNeeded,
                  rank: currentUserRank.nextRankNumber,
                })}
              </span>
              <span>{currentUserRank.percentileText}</span>
            </div>
          </div>
        </div>

        {/* Detailed Leaderboard List */}
        <div className="bg-white rounded-3xl shadow-sm border border-gray-200/80 overflow-hidden">
          <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
            <h3 className="font-bold text-gray-800 text-base sm:text-lg flex items-center gap-2">
              <ListOrdered className="w-5 h-5 text-emerald-600" />
              {t("detailsTitle")}
            </h3>
            <div className="flex items-center gap-1.5 text-xs sm:text-sm font-medium text-gray-500 bg-white px-3 py-1 rounded-full border border-gray-200">
              <Users className="w-4 h-4 text-gray-400" />
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
                  className={`flex items-center gap-3 sm:gap-4 px-4 sm:px-6 py-4 transition-all duration-200 hover:bg-emerald-50/40 ${
                    isCurrentUser
                      ? "bg-emerald-50/80 border-l-4 border-emerald-500 font-medium"
                      : ""
                  }`}
                >
                  <div className="w-7 text-center font-bold text-gray-500 text-sm sm:text-base">
                    {user.rank}
                  </div>
                  <Avatar className="w-10 h-10 sm:w-11 sm:h-11 border border-gray-200 shadow-xs">
                    <AvatarImage src={user.userImageSrc} className="object-cover" />
                    <AvatarFallback className="bg-gradient-to-br from-emerald-400 to-teal-600 text-white font-bold text-sm">
                      {user.userName.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-gray-900 text-sm sm:text-base truncate flex items-center gap-2">
                      <span>{user.userName}</span>
                      {isCurrentUser && (
                        <span className="bg-emerald-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                          {t("you")}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-gray-500 flex items-center gap-2 mt-0.5">
                      <span>{t("level", { level: user.level ?? 10 })}</span>
                      <span>•</span>
                      <span className="flex items-center gap-1 text-orange-600 font-medium">
                        <Flame className="w-3.5 h-3.5 fill-orange-500 text-orange-500" />
                        {t("streakDays", { count: user.streak ?? 7 })}
                      </span>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="font-bold text-gray-900 text-sm sm:text-base">
                      {t("points", { points: user.points })}
                    </div>
                    {user.trend === "up" && (
                      <div className="text-xs font-semibold text-emerald-600 flex items-center justify-end gap-0.5">
                        <ArrowUp className="w-3.5 h-3.5" />
                        <span>+{user.trendValue ?? 12}</span>
                      </div>
                    )}
                    {user.trend === "down" && (
                      <div className="text-xs font-semibold text-rose-500 flex items-center justify-end gap-0.5">
                        <ArrowDown className="w-3.5 h-3.5" />
                        <span>-{user.trendValue ?? 2}</span>
                      </div>
                    )}
                    {user.trend === "neutral" && (
                      <div className="text-xs font-semibold text-gray-400 flex items-center justify-end gap-0.5">
                        <Minus className="w-3.5 h-3.5" />
                        <span>0</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {topUsers.length > visibleCount && (
            <div className="p-4 border-t border-gray-100 text-center bg-gray-50/30">
              <button
                type="button"
                onClick={() => setVisibleCount((prev) => prev + 10)}
                className="inline-flex items-center gap-2 text-emerald-600 hover:text-emerald-700 font-semibold text-sm transition-colors py-1 px-4 rounded-xl hover:bg-emerald-50"
              >
                <ChevronDown className="w-4 h-4" />
                <span>
                  {t("loadMore", { count: topUsers.length - visibleCount })}
                </span>
              </button>
            </div>
          )}
        </div>

        {/* Season Rewards Section */}
        <div className="bg-gradient-to-br from-amber-50/80 via-orange-50/50 to-amber-100/50 rounded-3xl p-6 border border-amber-200/80 shadow-xs">
          <h3 className="font-bold text-gray-900 text-base sm:text-lg mb-4 flex items-center gap-2">
            <Gift className="w-5 h-5 text-amber-500" />
            {t("seasonRewards")}
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
            <div className="bg-white/90 backdrop-blur-xs rounded-2xl p-4 text-center border border-amber-100 shadow-xs transition-transform hover:-translate-y-0.5">
              <div className="text-3xl mb-2">🥇</div>
              <div className="font-bold text-gray-900 text-sm">
                {t("rankFirst")}
              </div>
              <div className="text-xs text-amber-700 font-medium mt-1">
                {t("rewardGold")}
              </div>
            </div>
            <div className="bg-white/90 backdrop-blur-xs rounded-2xl p-4 text-center border border-slate-100 shadow-xs transition-transform hover:-translate-y-0.5">
              <div className="text-3xl mb-2">🥈</div>
              <div className="font-bold text-gray-900 text-sm">
                {t("rankSecondThird")}
              </div>
              <div className="text-xs text-slate-600 font-medium mt-1">
                {t("rewardSilver")}
              </div>
            </div>
            <div className="bg-white/90 backdrop-blur-xs rounded-2xl p-4 text-center border border-orange-100 shadow-xs transition-transform hover:-translate-y-0.5">
              <div className="text-3xl mb-2">🥉</div>
              <div className="font-bold text-gray-900 text-sm">
                {t("rankFourthTenth")}
              </div>
              <div className="text-xs text-orange-700 font-medium mt-1">
                {t("rewardBronze")}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
