import type { ReactNode } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/app/components/ui/button";

type ToeicReadingWorkspaceProps = {
  instruction: string;
  question: ReactNode;
  feedback: ReactNode;
  questionDrawer: ReactNode;
  firstQuestion: boolean;
  lastQuestion: boolean;
  completeAvailable: boolean;
  busy: boolean;
  onPrevious: () => void;
  onNext: () => void;
  onComplete: () => void;
};

export function ToeicReadingWorkspace({
  instruction,
  question,
  feedback,
  questionDrawer,
  firstQuestion,
  lastQuestion,
  completeAvailable,
  busy,
  onPrevious,
  onNext,
  onComplete,
}: ToeicReadingWorkspaceProps) {
  const t = useTranslations("toeicReading");

  return (
    <div className="mx-auto grid min-w-0 max-w-[1440px] lg:min-h-[calc(100dvh-65px)] lg:grid-cols-[minmax(0,38fr)_minmax(0,62fr)]">
      <section className="min-w-0 border-b bg-white px-5 py-7 sm:px-8 lg:border-b-0 lg:border-r lg:px-10 dark:bg-slate-950">
        <p className="max-w-[65ch] text-base font-medium leading-7">
          {instruction}
        </p>
      </section>

      <section className="min-w-0 bg-slate-50/70 dark:bg-slate-950/40">
        <div className="mx-auto min-w-0 max-w-3xl space-y-4 px-4 py-6 sm:px-6 lg:py-8">
          {question}
          {feedback}
        </div>

        <footer className="bg-background/95 sticky bottom-0 z-20 border-t px-4 py-3 backdrop-blur sm:px-6">
          <div className="mx-auto flex min-w-0 max-w-3xl items-center justify-between gap-3">
            <Button
              type="button"
              variant="outline"
              disabled={firstQuestion || busy}
              onClick={onPrevious}
              className="gap-2 rounded-md"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              <span className="hidden sm:inline">{t("practice.previous")}</span>
            </Button>

            {questionDrawer}

            {lastQuestion ? (
              <Button
                type="button"
                variant="secondary"
                disabled={!completeAvailable || busy}
                onClick={onComplete}
                className="rounded-md"
              >
                {busy ? t("practice.completing") : t("practice.complete")}
              </Button>
            ) : (
              <Button
                type="button"
                variant="secondary"
                disabled={busy}
                onClick={onNext}
                className="gap-2 rounded-md"
              >
                <span className="hidden sm:inline">{t("practice.next")}</span>
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Button>
            )}
          </div>
        </footer>
      </section>
    </div>
  );
}
