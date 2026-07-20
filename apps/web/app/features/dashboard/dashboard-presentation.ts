import type { DashboardStats } from "@repo/shared";

type DashboardActivity = DashboardStats["activity"];

export function summarizeWeeklyActivity(activity: DashboardActivity) {
  return activity.reduce(
    (summary, day) => ({
      activeDays: summary.activeDays + (day.sessionCount > 0 ? 1 : 0),
      reviewedWords: summary.reviewedWords + day.wordCount,
    }),
    { activeDays: 0, reviewedWords: 0 }
  );
}

export function formatActivityWeekday(dateKey: string, locale: string) {
  return new Intl.DateTimeFormat(locale, {
    weekday: "narrow",
    timeZone: "UTC",
  }).format(new Date(`${dateKey}T00:00:00Z`));
}
