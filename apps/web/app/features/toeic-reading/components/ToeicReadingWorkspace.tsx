import type { ReactNode } from "react";
import type { ToeicReadingPart } from "@repo/shared";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/app/components/ui/button";
import { cn } from "@/app/utils/cn";

type ToeicReadingWorkspaceProps = {
  part: ToeicReadingPart;
  instruction: string;
  passage?: ReactNode;
  question: ReactNode;
  feedback: ReactNode;
  questionDrawer: ReactNode;
  questionSidebar?: ReactNode;
  firstQuestion: boolean;
  lastQuestion: boolean;
  completeAvailable: boolean;
  busy: boolean;
  onPrevious: () => void;
  onNext: () => void;
  onComplete: () => void;
};

export function ToeicReadingWorkspace({
  part,
  instruction,
  passage,
  question,
  feedback,
  questionDrawer,
  questionSidebar,
  firstQuestion,
  lastQuestion,
  completeAvailable,
  busy,
  onPrevious,
  onNext,
  onComplete,
}: ToeicReadingWorkspaceProps) {
  const t = useTranslations("toeicReading");

  const footer = (
    <footer className="bg-background/95 fixed bottom-0 left-0 right-0 z-40 w-full border-t px-3 py-2.5 backdrop-blur shadow-[0_-4px_16px_rgba(15,23,42,0.06)] sm:px-6">
      <div className="mx-auto flex w-full min-w-0 max-w-[1440px] items-center justify-between gap-2 sm:gap-3">
        <Button
          type="button"
          variant="outline"
          disabled={firstQuestion || busy}
          onClick={onPrevious}
          className="gap-2 rounded-md"
          aria-label={t("practice.previous")}
        >
          <ArrowLeft className="h-4 w-4 shrink-0" aria-hidden="true" />
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
            aria-label={t("practice.next")}
          >
            <span className="hidden sm:inline">{t("practice.next")}</span>
            <ArrowRight className="h-4 w-4 shrink-0" aria-hidden="true" />
          </Button>
        )}
      </div>
    </footer>
  );

  return (
    <div className="relative flex flex-col h-[calc(100dvh-61px)] overflow-hidden pb-14">
      <div
        className={cn(
          "mx-auto grid w-full flex-1 min-w-0 max-w-[1440px] h-full overflow-hidden",
          passage
            ? "lg:grid-cols-[minmax(0,38fr)_minmax(0,62fr)]"
            : "md:grid-cols-[minmax(0,70fr)_minmax(0,30fr)] lg:grid-cols-[minmax(0,70fr)_minmax(0,30fr)]"
        )}
      >
        <section className="flex min-w-0 flex-col border-b bg-white h-full overflow-y-auto md:border-b-0 md:border-r dark:bg-slate-950">
          {passage ? (
            <div className="px-5 py-7 sm:px-8 pb-16">
              {passage}
            </div>
          ) : (
            <div className="w-full space-y-4 px-5 py-6 sm:px-8 lg:px-10 lg:py-8 pb-16">
              <p className="text-muted-foreground max-w-[65ch] text-xs font-semibold uppercase tracking-wider">
                {instruction}
              </p>
              {question}
              {feedback}
            </div>
          )}
        </section>

        <section className="hidden min-w-0 bg-slate-50/70 p-6 h-full overflow-y-auto md:block dark:bg-slate-950/40 pb-16">
          {passage ? (
            <div className="mx-auto min-w-0 max-w-3xl space-y-4 px-4 py-6 sm:px-6 lg:py-8 pb-16">
              {question}
              {feedback}
            </div>
          ) : (
            <div className="mx-auto max-w-sm hidden md:block lg:block">
              {questionSidebar}
            </div>
          )}
        </section>
      </div>

      {footer}
    </div>
  );
}
