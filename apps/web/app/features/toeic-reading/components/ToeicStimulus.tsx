import type { ToeicReadingStimulus } from "@repo/shared";
import { Languages } from "lucide-react";
import { useTranslations } from "next-intl";

type ToeicStimulusProps = {
  stimulus: ToeicReadingStimulus;
};

export function ToeicStimulus({ stimulus }: ToeicStimulusProps) {
  const t = useTranslations("toeicReading");

  return (
    <article className="bg-card rounded-2xl border p-6 sm:p-8">
      <h3 className="sr-only">{t("session.stimulus")}</h3>
      {stimulus.body ? (
        <div className="text-foreground whitespace-pre-line text-base leading-8">
          {stimulus.body}
        </div>
      ) : (
        <p className="text-muted-foreground text-sm">
          {t("session.stimulusUnavailable")}
        </p>
      )}
      {stimulus.translation ? (
        <details className="mt-6 border-t pt-4">
          <summary className="inline-flex cursor-pointer items-center gap-2 text-sm font-semibold text-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 dark:text-emerald-300">
            <Languages className="h-4 w-4" aria-hidden="true" />
            {t("session.showTranslation")}
          </summary>
          <p className="text-muted-foreground mt-3 whitespace-pre-line text-sm leading-7">
            {stimulus.translation}
          </p>
        </details>
      ) : null}
    </article>
  );
}
