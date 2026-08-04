import type { ReactNode } from "react";
import type {
  ToeicReadingPart,
  ToeicReadingPracticeProgress,
} from "@repo/shared";
import { ArrowLeft } from "lucide-react";
import { useTranslations } from "next-intl";

import { Progress } from "@/app/components/ui/progress";
import { Button } from "@/app/components/ui/button";
import { useExitModal } from "@/app/features/lessons/store/exit-modal.store";

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
  const { open: openExitModal } = useExitModal();
  const progressValue = total === 0 ? 0 : (progress.answered / total) * 100;

  return (
    <main className="bg-background min-h-dvh min-w-0 overflow-x-hidden">
      <header className="bg-background/95 sticky top-0 z-30 border-b backdrop-blur">
        <div className="mx-auto flex flex-col justify-center gap-2 max-w-[1440px] px-5 py-2.5 sm:px-8 lg:px-10">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <Button
                type="button"
                variant="ghost"
                onClick={() => openExitModal(`/learn/cert/toeic/reading?scope=${part}`)}
                className="text-muted-foreground inline-flex min-w-0 shrink-0 items-center gap-1.5 rounded-md text-sm font-semibold transition-colors hover:text-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
              >
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                <span>{t("practice.back")}</span>
              </Button>
              <span className="text-muted-foreground/40">|</span>
              <span className="truncate text-sm font-bold text-foreground">{title}</span>
            </div>

            <div className="flex items-center gap-3 text-xs font-semibold shrink-0">
              <span className="text-muted-foreground tabular-nums">
                {t("practice.questionPosition", { current, total })}
              </span>
              <span className="tabular-nums text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 dark:bg-emerald-950/60 dark:border-emerald-900">
                {t("practice.correctCount", { count: progress.correct })}
              </span>
              <span className="tabular-nums text-rose-600 bg-rose-50 px-2 py-0.5 rounded border border-rose-200 dark:bg-rose-950/60 dark:border-rose-900">
                {t("practice.incorrectCount", { count: progress.incorrect })}
              </span>
            </div>
          </div>

          <Progress
            value={progressValue}
            aria-label={t("practice.progressLabel")}
            className="h-1.5 w-full"
          />
        </div>
      </header>
      {children}
    </main>
  );
}
