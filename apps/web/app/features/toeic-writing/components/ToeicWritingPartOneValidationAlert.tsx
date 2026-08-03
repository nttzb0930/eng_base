import type { ToeicWritingPartOneValidationIssue } from "@repo/shared";
import { AlertTriangle } from "lucide-react";
import { useTranslations } from "next-intl";

import { Alert, AlertDescription, AlertTitle } from "@/app/components/ui/alert";

export function ToeicWritingPartOneValidationAlert({
  issues,
}: {
  issues: ToeicWritingPartOneValidationIssue[];
}) {
  const t = useTranslations("toeicWriting.partOneGrading");
  if (issues.length === 0) return null;

  return (
    <Alert className="mt-5 rounded-md border-amber-300 bg-amber-50 text-amber-950 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
      <AlertTriangle className="h-4 w-4" aria-hidden="true" />
      <AlertTitle>{t("validation.title")}</AlertTitle>
      <AlertDescription>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
          {issues.map((issue, index) => (
            <li key={`${issue.code}-${issue.keyword ?? index}`}>
              {issue.code === "REQUIRED_WORD_MISSING"
                ? t(`validation.${issue.code}`, {
                    keyword: issue.keyword ?? "",
                  })
                : t(`validation.${issue.code}`)}
            </li>
          ))}
        </ul>
      </AlertDescription>
    </Alert>
  );
}
