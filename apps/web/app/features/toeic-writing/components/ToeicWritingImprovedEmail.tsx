import type { ToeicWritingImprovedEmail as ImprovedEmail } from "@repo/shared";
import { Replace } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/app/components/ui/button";

export function ToeicWritingImprovedEmail({
  email,
  onReplace,
}: {
  email: ImprovedEmail;
  onReplace(): void;
}) {
  const t = useTranslations("toeicWriting.partTwoGrading");
  return (
    <section className="rounded-md border border-violet-200 bg-violet-50/60 p-4 dark:border-violet-900 dark:bg-violet-950/20">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="font-semibold">{t("section.improvedEmail")}</h3>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="gap-2 rounded-md"
          onClick={onReplace}
        >
          <Replace className="h-4 w-4" aria-hidden="true" />
          {t("replace")}
        </Button>
      </div>
      <p className="mt-4 whitespace-pre-wrap text-sm leading-7">{email.text}</p>
      {email.differences.length ? (
        <div className="mt-4 border-t pt-3">
          <p className="text-sm font-medium">{t("differences")}</p>
          <ul className="text-muted-foreground mt-2 list-disc space-y-1 pl-5 text-sm">
            {email.differences.map((difference, index) => (
              <li key={`${difference}-${index}`}>{difference}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
