import type { ToeicWritingPartOneTaskSummary } from "@repo/shared";

export type ToeicWritingPatternFilter = {
  value: string | null;
  count: number;
};

function normalizedPattern(pattern: string | null): string | null {
  const normalized = pattern?.trim();
  return normalized || null;
}

export function buildToeicWritingPatternFilters(
  tasks: ToeicWritingPartOneTaskSummary[]
): ToeicWritingPatternFilter[] {
  const counts = new Map<string, number>();
  for (const task of tasks) {
    const pattern = normalizedPattern(task.pattern);
    if (!pattern) continue;
    counts.set(pattern, (counts.get(pattern) ?? 0) + 1);
  }
  return [
    { value: null, count: tasks.length },
    ...Array.from(counts, ([value, count]) => ({ value, count })),
  ];
}

export function filterToeicWritingPartOneTasks(
  tasks: ToeicWritingPartOneTaskSummary[],
  pattern: string | null
): ToeicWritingPartOneTaskSummary[] {
  const selectedPattern = normalizedPattern(pattern);
  if (!selectedPattern) return tasks;
  return tasks.filter(
    (task) => normalizedPattern(task.pattern) === selectedPattern
  );
}
