"use client";

import type { ToeicWritingPartTwoCoaching } from "@repo/shared";
import { Languages } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { Button } from "@/app/components/ui/button";

type SampleData = Extract<ToeicWritingPartTwoCoaching, { kind: "SAMPLE" }>;

export function ToeicWritingSamplePanel({ data }: { data: SampleData }) {
  const t = useTranslations("toeicWriting.partTwoCoaching");
  const [showVietnamese, setShowVietnamese] = useState(false);

  if (!data.sampleEn) {
    return (
      <p className="text-muted-foreground py-8 text-center text-sm">
        {t("empty")}
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {data.sampleVi ? (
        <div className="flex justify-end">
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="gap-2 rounded-md"
            onClick={() => setShowVietnamese((current) => !current)}
          >
            <Languages className="h-4 w-4" aria-hidden="true" />
            {showVietnamese ? t("hideVietnamese") : t("showVietnamese")}
          </Button>
        </div>
      ) : null}
      <div className="whitespace-pre-wrap rounded-md border bg-slate-50 p-4 text-sm leading-7 dark:bg-slate-900/60">
        {data.sampleEn}
      </div>
      {showVietnamese && data.sampleVi ? (
        <div className="whitespace-pre-wrap rounded-md border border-sky-200 bg-sky-50 p-4 text-sm leading-7 text-sky-950 dark:border-sky-900 dark:bg-sky-950/40 dark:text-sky-100">
          {data.sampleVi}
        </div>
      ) : null}
      {data.structure.length ? (
        <div className="grid gap-3 sm:grid-cols-3">
          {data.structure.map((section) => (
            <section key={section.kind} className="rounded-md border p-3">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">
                {t(`section.${section.kind}`)}
              </h3>
              <p className="mt-2 text-sm leading-6">{section.textEn}</p>
              {section.textVi ? (
                <p className="text-muted-foreground mt-1 text-sm leading-6">
                  {section.textVi}
                </p>
              ) : null}
            </section>
          ))}
        </div>
      ) : null}
    </div>
  );
}
