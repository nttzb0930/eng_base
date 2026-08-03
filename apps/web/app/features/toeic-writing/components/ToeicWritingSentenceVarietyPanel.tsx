import type { ToeicWritingSentenceVarietyFeedback } from "@repo/shared";
import { useTranslations } from "next-intl";

import { Badge } from "@/app/components/ui/badge";

export function ToeicWritingSentenceVarietyPanel({
  feedback,
}: {
  feedback: ToeicWritingSentenceVarietyFeedback;
}) {
  const t = useTranslations("toeicWriting.partTwoGrading");
  return (
    <details className="bg-card rounded-md border p-4">
      <summary className="cursor-pointer list-none font-semibold">
        {t("section.sentenceVariety")}
      </summary>
      <p className="text-muted-foreground mt-3 text-sm leading-6">
        {feedback.feedback}
      </p>
      <div className="mt-3 space-y-2">
        {feedback.detected.map((item, index) => (
          <div key={`${item.kind}-${index}`} className="rounded-md border p-3">
            <Badge variant="secondary">{t(`sentenceKind.${item.kind}`)}</Badge>
            <p className="mt-2 text-sm">{item.evidence.text}</p>
          </div>
        ))}
      </div>
    </details>
  );
}
