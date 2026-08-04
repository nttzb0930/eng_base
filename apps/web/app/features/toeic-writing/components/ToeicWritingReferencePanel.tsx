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
    <section className="bg-card max-h-none overflow-visible rounded-xl border border-slate-200/80 p-4 sm:p-6 animate-in fade-in-0 slide-in-from-top-3 duration-300 ease-out shadow-xs dark:border-slate-800">
      <div className="flex items-center gap-2.5">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10">
          <BookOpenCheck className="h-4 w-4 text-emerald-600" aria-hidden="true" />
        </div>
        <h2 className="text-base font-semibold text-foreground">{t("referenceTitle")}</h2>
      </div>
      <Alert className="mt-4 border-amber-200/80 bg-amber-50/60 dark:border-amber-900/60 dark:bg-amber-950/20">
        <AlertTitle className="text-amber-900 dark:text-amber-100">
          {notScored}
        </AlertTitle>
        <AlertDescription className="text-amber-800/90 dark:text-amber-200/80">
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
  const renderedValues = new Set<string>();

  return (
    <div className="mt-6 divide-y divide-slate-100 dark:divide-slate-800">
      {sections.map((section) => (
        <section key={section.title} className="py-5 first:pt-0 last:pb-0">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Lightbulb className="h-4 w-4 shrink-0 text-emerald-600" aria-hidden="true" />
            {section.title}
          </h3>
          <div className="mt-3 space-y-2.5">
            {section.values.map((value, index) => {
              const valueKey = value.replace(/\s+/gu, " ").trim().toLocaleLowerCase();
              if (renderedValues.has(valueKey)) return null;
              renderedValues.add(valueKey);

              const bullets = value
                .split(/\s*•\s*/u)
                .map((item) => item.trim())
                .filter(Boolean);

              if (bullets.length > 1) {
                return (
                  <ul
                    key={`${section.title}-${index}`}
                    className="list-disc space-y-1.5 pl-5 text-sm leading-7 text-foreground"
                  >
                    {bullets.map((bullet, bIdx) => (
                      <li key={bIdx}>{bullet}</li>
                    ))}
                  </ul>
                );
              }

              const hasTranslation = !!section.translations?.[index];

              return (
                <div
                  key={`${section.title}-${index}`}
                  className="overflow-hidden rounded-xl border border-slate-200/80 bg-slate-50/60 dark:border-slate-800 dark:bg-slate-900/40"
                >
                  {/* English */}
                  <div className="flex gap-3 px-3.5 pt-3.5 pb-2.5">
                    <span className="mt-0.5 self-start shrink-0 rounded-md bg-slate-800 px-1.5 py-0.5 text-[10px] font-bold tracking-widest text-white uppercase dark:bg-slate-700">
                      EN
                    </span>
                    <p className="text-sm font-medium leading-relaxed text-foreground">{value}</p>
                  </div>
                  {/* Vietnamese translation */}
                  {hasTranslation ? (
                    <div className="flex gap-3 border-t border-slate-200/80 bg-blue-50/60 px-3.5 py-2.5 dark:border-slate-800 dark:bg-blue-950/20">
                      <span className="mt-0.5 self-start shrink-0 rounded-md bg-blue-600 px-1.5 py-0.5 text-[10px] font-bold tracking-widest text-white uppercase dark:bg-blue-700">
                        VI
                      </span>
                      <p className="text-sm italic leading-relaxed text-blue-800 dark:text-blue-300">
                        {section.translations![index]}
                      </p>
                    </div>
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
    <div className="mt-6 divide-y divide-slate-100 dark:divide-slate-800">
      <section className="pb-5">
        <h3 className="mb-3 text-sm font-semibold text-foreground">{t("sampleResponse")}</h3>
        <div className="overflow-hidden rounded-xl border border-slate-200/80 bg-slate-50/60 dark:border-slate-800 dark:bg-slate-900/40">
          <div className="flex gap-3 px-3.5 pt-3.5 pb-2.5">
            <span className="mt-1 self-start shrink-0 rounded-md bg-slate-800 px-1.5 py-0.5 text-[10px] font-bold tracking-widest text-white uppercase dark:bg-slate-700">
              EN
            </span>
            <p className="whitespace-pre-wrap text-sm font-medium leading-7 text-foreground">
              {submission.reference.sampleEn}
            </p>
          </div>
          {submission.reference.sampleVi ? (
            <div className="flex gap-3 border-t border-slate-200/80 bg-blue-50/60 px-3.5 py-2.5 dark:border-slate-800 dark:bg-blue-950/20">
              <span className="mt-1 self-start shrink-0 rounded-md bg-blue-600 px-1.5 py-0.5 text-[10px] font-bold tracking-widest text-white uppercase dark:bg-blue-700">
                VI
              </span>
              <p className="whitespace-pre-wrap text-sm italic leading-7 text-blue-800 dark:text-blue-300">
                {submission.reference.sampleVi}
              </p>
            </div>
          ) : null}
        </div>
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
            {group.values.map((value, index) => {
              const cleanedValue = value
                .replace(/\\n/gu, " ")
                .replace(/\n/gu, " ")
                .replace(/\s+/gu, " ")
                .trim();
              return <li key={`${group.title}-${index}`}>{cleanedValue}</li>;
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
