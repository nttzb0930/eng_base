"use client";

import type { ToeicWritingSubmissionResult } from "@repo/shared";
import { BookOpenCheck, Lightbulb, ListChecks } from "lucide-react";
import { useTranslations } from "next-intl";

import { Alert, AlertDescription, AlertTitle } from "@/app/components/ui/alert";

type ToeicWritingReferencePanelProps = {
  submission: ToeicWritingSubmissionResult;
};

export function ToeicWritingReferencePanel({
  submission,
}: ToeicWritingReferencePanelProps) {
  const t = useTranslations("toeicWriting.result");
  const notScored = t("notScored");

  return (
    <section className="bg-card max-h-[500px] overflow-y-auto rounded-md border p-4 sm:p-6 pr-3 animate-in fade-in-0 slide-in-from-top-3 duration-300 ease-out [scrollbar-gutter:stable]">
      <div className="flex items-center gap-2">
        <BookOpenCheck
          className="h-5 w-5 text-emerald-600"
          aria-hidden="true"
        />
        <h2 className="text-lg font-semibold">{t("referenceTitle")}</h2>
      </div>
      <Alert className="mt-4 border-amber-200 bg-amber-50/70 dark:border-amber-900 dark:bg-amber-950/30">
        <AlertTitle className="text-amber-900 dark:text-amber-100">
          {notScored}
        </AlertTitle>
        <AlertDescription className="text-amber-800 dark:text-amber-200">
          {t("referenceDescription")}
        </AlertDescription>
      </Alert>

      {submission.part === 1 ? (
        <PartOneReference submission={submission} />
      ) : (
        <PartTwoReference submission={submission} />
      )}
    </section>
  );
}

function PartOneReference({
  submission,
}: {
  submission: Extract<ToeicWritingSubmissionResult, { part: 1 }>;
}) {
  const t = useTranslations("toeicWriting.result");
  const sections = [
    {
      title: t("sampleResponses"),
      values: submission.reference.samplesEn,
      translations: submission.reference.samplesVi,
    },
    {
      title: t("structureSuggestions"),
      values: submission.reference.structureSuggestions,
    },
    { title: t("ideas"), values: submission.reference.ideas },
  ];

  return (
    <div className="mt-6 divide-y">
      {sections.map((section) => (
        <section key={section.title} className="py-5 first:pt-0 last:pb-0">
          <h3 className="flex items-center gap-2 text-sm font-semibold">
            <Lightbulb
              className="h-4 w-4 text-emerald-600"
              aria-hidden="true"
            />
            {section.title}
          </h3>
          <div className="mt-3 space-y-3">
            {section.values.map((value, index) => {
              const bullets = value
                .split(/\s*•\s*/u)
                .map((item) => item.trim())
                .filter(Boolean);

              if (bullets.length > 1) {
                return (
                  <ul
                    key={`${section.title}-${index}`}
                    className="list-disc space-y-2 pl-5 text-sm leading-7 text-foreground"
                  >
                    {bullets.map((bullet, bIdx) => (
                      <li key={bIdx}>{bullet}</li>
                    ))}
                  </ul>
                );
              }

              return (
                <div
                  key={`${section.title}-${index}`}
                  className="text-sm leading-7 text-foreground"
                >
                  <p>{value}</p>
                  {section.translations?.[index] ? (
                    <p className="text-muted-foreground mt-1">
                      {section.translations[index]}
                    </p>
                  ) : null}
                </div>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}

function PartTwoReference({
  submission,
}: {
  submission: Extract<ToeicWritingSubmissionResult, { part: 2 }>;
}) {
  const t = useTranslations("toeicWriting.result");
  const groups = [
    { title: t("outlineLevel1"), values: submission.reference.outlineLevel1 },
    { title: t("outlineLevel2"), values: submission.reference.outlineLevel2 },
    { title: t("chunksLevel1"), values: submission.reference.chunksLevel1 },
    { title: t("chunksLevel2"), values: submission.reference.chunksLevel2 },
  ];

  return (
    <div className="mt-6 divide-y">
      <section className="pb-5">
        <h3 className="text-sm font-semibold">{t("sampleResponse")}</h3>
        <p className="mt-3 whitespace-pre-wrap text-sm leading-7">
          {submission.reference.sampleEn}
        </p>
        {submission.reference.sampleVi ? (
          <p className="text-muted-foreground mt-3 whitespace-pre-wrap text-sm leading-7">
            {submission.reference.sampleVi}
          </p>
        ) : null}
      </section>
      {groups.map((group) => (
        <section key={group.title} className="py-5 last:pb-0">
          <h3 className="flex items-center gap-2 text-sm font-semibold">
            <ListChecks
              className="h-4 w-4 text-emerald-600"
              aria-hidden="true"
            />
            {group.title}
          </h3>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-7">
            {group.values.map((value, index) => (
              <li key={`${group.title}-${index}`}>{value}</li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
