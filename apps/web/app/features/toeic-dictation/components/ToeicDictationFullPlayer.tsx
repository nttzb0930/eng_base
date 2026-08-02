"use client";

import { Eye, EyeOff } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { Button } from "@/app/components/ui/button";
import { CompactAudioPlayer } from "@/app/features/toeic-dictation/components/CompactAudioPlayer";

export type ToeicDictationFullQuestion = {
  id: number;
  label: string;
};

type Props = {
  src: string | null;
  current: number;
  total: number;
  questions: ToeicDictationFullQuestion[];
  activeQuestionId: number;
  transcript?: string;
  translationVi?: string | null;
  isContentLoading: boolean;
  onSelectQuestion: (questionId: number) => void;
};

export function ToeicDictationFullPlayer({
  src,
  current,
  total,
  questions,
  activeQuestionId,
  transcript,
  translationVi,
  isContentLoading,
  onSelectQuestion,
}: Props) {
  const t = useTranslations("toeicDictation.session");
  const [autoplay, setAutoplay] = useState(true);
  const [showScript, setShowScript] = useState(true);

  return (
    <div className="space-y-6">
      <section className="bg-card rounded-2xl border p-4 shadow-sm sm:p-6">
        <p className="text-muted-foreground mb-3 text-center text-sm font-semibold tabular-nums">
          {t("question", { current, total })}
        </p>

        {src ? (
          <CompactAudioPlayer
            src={src}
            playLabel={t("play")}
            pauseLabel={t("pause")}
            replayLabel={t("replay")}
            replayCountLabel={t("replayCount")}
            replayDelayLabel={t("replayDelay")}
            replayApplyLabel={t("replayApply")}
            replayTimesSuffix={t("replayTimesSuffix")}
            replaySecondsSuffix={t("replaySecondsSuffix")}
            progressLabel={t("audioProgress")}
            volumeLabel={t("volume")}
            volumeProgressLabel={t("volumeProgress")}
          />
        ) : (
          <p className="text-muted-foreground rounded-xl border border-dashed p-4 text-center text-sm">
            {t("audioUnavailable")}
          </p>
        )}

        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t pt-3">
          <Button
            type="button"
            variant={autoplay ? "secondary" : "outline"}
            size="sm"
            className={`h-8 rounded-xl px-2.5 text-xs ${
              autoplay
                ? "bg-emerald-500/15 text-emerald-700 hover:bg-emerald-500/25 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800"
                : ""
            }`}
            onClick={() => setAutoplay((value) => !value)}
            aria-pressed={autoplay}
          >
            {t("autoplay", { state: autoplay ? t("enabled") : t("disabled") })}
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 rounded-xl px-2.5 text-xs"
            onClick={() => setShowScript((value) => !value)}
            aria-pressed={showScript}
          >
            {showScript ? (
              <EyeOff className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
            ) : (
              <Eye className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
            )}
            {showScript ? t("hideScript") : t("showScript")}
          </Button>
        </div>
      </section>

      {showScript && (
        <section className="bg-card rounded-md border p-6 shadow-sm sm:p-8">
          {isContentLoading ? (
            <p className="text-muted-foreground text-sm">{t("checking")}</p>
          ) : transcript ? (
            <>
              <p className="text-muted-foreground text-xs font-semibold uppercase tracking-wide">
                {t("transcript")}
              </p>
              <p className="mt-3 text-base leading-7">{transcript}</p>
              {translationVi && (
                <>
                  <p className="text-muted-foreground mt-6 text-xs font-semibold uppercase tracking-wide">
                    {t("translation")}
                  </p>
                  <p className="text-muted-foreground mt-3 text-sm leading-6 italic">
                    {translationVi}
                  </p>
                </>
              )}
            </>
          ) : (
            <p className="text-muted-foreground text-sm">{t("audioUnavailable")}</p>
          )}
        </section>
      )}

      <section className="bg-card rounded-md border p-4 shadow-sm sm:p-5">
        <p className="text-muted-foreground text-xs font-semibold uppercase tracking-wide">
          {t("questionList")}
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {questions.map((question) => {
            const selected = question.id === activeQuestionId;
            return (
              <Button
                key={question.id}
                type="button"
                size="icon"
                variant={selected ? "default" : "secondary"}
                className="h-9 w-9 rounded-md text-sm"
                onClick={() => onSelectQuestion(question.id)}
                aria-current={selected ? "step" : undefined}
                aria-label={t("goToQuestion", { number: question.label })}
              >
                {question.label}
              </Button>
            );
          })}
        </div>
      </section>
    </div>
  );
}
