"use client";

import type { ToeicWritingPartTwoCoaching } from "@repo/shared";
import { Languages } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { Button } from "@/app/components/ui/button";

type SampleData = Extract<ToeicWritingPartTwoCoaching, { kind: "SAMPLE" }>;

function formatParagraphText(text?: string | null) {
  if (!text) return "";
  return text.replace(/\\n/gu, "\n").trim();
}

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
      {data.structure.length ? (
        <div className="space-y-3 w-full">
          {data.structure.map((section) => {
            const textEnFormatted = formatParagraphText(section.textEn);
            const textViFormatted = formatParagraphText(section.textVi);
            if (!textEnFormatted && !textViFormatted) return null;
            return (
              <section key={section.kind} className="w-full rounded-md border p-4 bg-card">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-300 mb-2">
                  {t(`section.${section.kind}`)}
                </h3>
                {textEnFormatted ? (
                  <p className="text-sm leading-relaxed whitespace-pre-wrap text-foreground font-medium">
                    {textEnFormatted}
                  </p>
                ) : null}
                {showVietnamese && textViFormatted ? (
                  <p className="text-muted-foreground mt-2 text-xs leading-relaxed whitespace-pre-wrap border-t border-border/40 pt-2">
                    {textViFormatted}
                  </p>
                ) : null}
              </section>
            );
          })}
        </div>
      ) : (
        <section className="w-full rounded-md border bg-card p-4">
          <p className="whitespace-pre-wrap text-sm font-medium leading-relaxed text-foreground">
            {formatParagraphText(data.sampleEn)}
          </p>
          {showVietnamese && data.sampleVi ? (
            <p className="mt-2 whitespace-pre-wrap border-t border-border/40 pt-2 text-xs leading-relaxed text-muted-foreground">
              {formatParagraphText(data.sampleVi)}
            </p>
          ) : null}
        </section>
      )}
    </div>
  );
}
