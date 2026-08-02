import type { ReactNode } from "react";
import type {
  ToeicReadingPart,
  ToeicReadingPracticeProgress,
} from "@repo/shared";
import { ArrowLeft } from "lucide-react";
import { useTranslations } from "next-intl";

import { LocalizedLink as Link } from "@/app/components/navigation/LocalizedLink";
import { Progress } from "@/app/components/ui/progress";

type ToeicReadingPracticeShellProps = {
  part: ToeicReadingPart;
  title: string;
  current: number;
  total: number;
  progress: ToeicReadingPracticeProgress;
  children: ReactNode;
};

export function ToeicReadingPracticeShell({
  part,
  title,
  current,
  total,
  progress,
  children,
}: ToeicReadingPracticeShellProps) {
  const t = useTranslations("toeicReading");
  const progressValue = total === 0 ? 0 : (progress.answered / total) * 100;

  return (
    <main className="bg-background min-h-dvh min-w-0 overflow-x-hidden">
      <header className="bg-background/95 sticky top-0 z-30 border-b backdrop-blur">
        <div className="mx-auto flex min-w-0 max-w-[1440px] items-center gap-3 px-4 py-3 sm:px-6">
          <Link
            href={`/learn/cert/toeic/reading?scope=${part}`}
            className="text-muted-foreground inline-flex min-w-0 shrink-0 items-center gap-2 rounded-md text-sm font-semibold transition-colors hover:text-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            <span className="hidden sm:inline">{t("practice.back")}</span>
          </Link>

          <div className="min-w-0 flex-1">
            <div className="mb-1.5 flex min-w-0 items-center justify-between gap-3 text-xs font-semibold">
              <span className="truncate">{title}</span>
              <span className="text-muted-foreground shrink-0 tabular-nums">
                {t("practice.questionPosition", { current, total })}
              </span>
            </div>
            <Progress
              value={progressValue}
              aria-label={t("practice.progressLabel")}
              className="h-1.5"
            />
          </div>

          <div className="hidden shrink-0 items-center gap-3 text-xs font-semibold md:flex">
            <span className="tabular-nums text-emerald-700">
              {t("practice.correctCount", { count: progress.correct })}
            </span>
            <span className="tabular-nums text-rose-600">
              {t("practice.incorrectCount", { count: progress.incorrect })}
            </span>
          </div>
        </div>
      </header>
      {children}
    </main>
  );
}
