import type { ToeicWritingTaskCompletionFeedback } from "@repo/shared";
import { CheckCircle2, CircleAlert, XCircle } from "lucide-react";
import { useTranslations } from "next-intl";

import { Badge } from "@/app/components/ui/badge";

const statusIcon = {
  MET: CheckCircle2,
  PARTIAL: CircleAlert,
  MISSING: XCircle,
} as const;

export function ToeicWritingTaskCompletionPanel({
  feedback,
}: {
  feedback: ToeicWritingTaskCompletionFeedback;
}) {
  const t = useTranslations("toeicWriting.partTwoGrading");

  return (
    <details className="bg-card rounded-md border p-4" open>
      <summary className="cursor-pointer list-none font-semibold">
        {t("section.taskCompletion")} · {feedback.completedCount}/
        {feedback.totalCount}
      </summary>
      <div className="mt-4 space-y-3">
        {feedback.requirements.map((requirement) => {
          const Icon = statusIcon[requirement.status];
          return (
            <article
              key={requirement.requirementId}
              className="rounded-md border p-3"
            >
              <div className="flex items-start gap-2">
                <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium">{requirement.comment}</p>
                    <Badge variant="outline">
                      {t(`requirementStatus.${requirement.status}`)}
                    </Badge>
                  </div>
                  {requirement.evidence.map((evidence, index) => (
                    <blockquote
                      key={`${evidence.start}-${evidence.end}-${index}`}
                      className="text-muted-foreground mt-2 border-l-2 pl-3 text-sm"
                    >
                      {evidence.text}
                    </blockquote>
                  ))}
                  {requirement.suggestedFix ? (
                    <p className="mt-2 text-sm">
                      <span className="font-medium">{t("suggestedFix")}: </span>
                      {requirement.suggestedFix}
                    </p>
                  ) : null}
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </details>
  );
}
