const MILLISECONDS_PER_DAY = 86_400_000;

export type DashboardLearningDay = {
  date: string;
  lastLearningAt: Date;
};

export type DashboardStreakResult = {
  currentStreak: number;
  longestStreak: number;
  lastLearningAt: Date | null;
  timeZone: "UTC";
};

const toEpochDay = (date: string) =>
  Math.floor(Date.parse(`${date}T00:00:00.000Z`) / MILLISECONDS_PER_DAY);

const utcEpochDay = (date: Date) =>
  Math.floor(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()) /
      MILLISECONDS_PER_DAY
  );

export function calculateDashboardStreak(
  activityDates: DashboardLearningDay[],
  now: Date
): DashboardStreakResult {
  const latestByDate = new Map<string, DashboardLearningDay>();

  for (const activity of activityDates) {
    const existing = latestByDate.get(activity.date);
    if (
      !existing ||
      activity.lastLearningAt.getTime() > existing.lastLearningAt.getTime()
    ) {
      latestByDate.set(activity.date, activity);
    }
  }

  const days = [...latestByDate.values()].sort(
    (left, right) => toEpochDay(left.date) - toEpochDay(right.date)
  );
  if (days.length === 0) {
    return {
      currentStreak: 0,
      longestStreak: 0,
      lastLearningAt: null,
      timeZone: "UTC",
    };
  }

  let currentRun = 1;
  let longestStreak = 1;
  for (let index = 1; index < days.length; index += 1) {
    const previousDay = toEpochDay(days[index - 1]!.date);
    const currentDay = toEpochDay(days[index]!.date);
    currentRun = currentDay === previousDay + 1 ? currentRun + 1 : 1;
    longestStreak = Math.max(longestStreak, currentRun);
  }

  const lastDay = days[days.length - 1]!;
  const lastEpochDay = toEpochDay(lastDay.date);
  const todayEpochDay = utcEpochDay(now);
  const isCurrent = lastEpochDay === todayEpochDay || lastEpochDay === todayEpochDay - 1;

  return {
    currentStreak: isCurrent ? currentRun : 0,
    longestStreak,
    lastLearningAt: lastDay.lastLearningAt,
    timeZone: "UTC",
  };
}
