import type { ToeicWritingGrammarFeedback } from "@repo/shared";
import { useTranslations } from "next-intl";

import { Badge } from "@/app/components/ui/badge";

export function ToeicWritingGrammarPanel({
  feedback,
}: {
  feedback: ToeicWritingGrammarFeedback;
}) {
  const t = useTranslations("toeicWriting.partTwoGrading");
  return (
    <details className="bg-card rounded-md border p-4">
      <summary className="cursor-pointer list-none font-semibold">
        {t("section.grammar")} · {feedback.errors.length}
      </summary>
      <p className="text-muted-foreground mt-3 text-sm leading-6">
        {feedback.feedback}
      </p>
      <div className="mt-3 space-y-2">
        {feedback.errors.map((error, index) => (
          <article
            key={`${error.evidence.start}-${index}`}
            className="rounded-md border p-3"
          >
            <Badge
              variant={error.severity === "SERIOUS" ? "destructive" : "outline"}
            >
              {t(`grammarSeverity.${error.severity}`)}
            </Badge>
            <p className="mt-2 text-sm line-through">{error.evidence.text}</p>
            <p className="mt-1 text-sm font-medium">{error.correction}</p>
            <p className="text-muted-foreground mt-1 text-sm">
              {error.explanation}
            </p>
          </article>
        ))}
      </div>
    </details>
  );
}
