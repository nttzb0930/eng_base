"use client";

import type { ToeicWritingPartTwoCoaching } from "@repo/shared";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { Button } from "@/app/components/ui/button";

type VocabularyData = Extract<
  ToeicWritingPartTwoCoaching,
  { kind: "VOCABULARY" }
>;

export function ToeicWritingVocabularyPanel({
  data,
}: {
  data: VocabularyData;
}) {
  const t = useTranslations("toeicWriting.partTwoCoaching");
  const [level, setLevel] = useState<1 | 2>(1);
  const items =
    data.variants.find((variant) => variant.level === level)?.items ?? [];

  return (
    <div className="space-y-4">
      <div className="flex gap-2" role="tablist" aria-label={t("variantLabel")}>
        {[1, 2].map((item) => (
          <Button
            key={item}
            type="button"
            size="sm"
            variant={level === item ? "secondary" : "outline"}
            className="rounded-md"
            onClick={() => setLevel(item as 1 | 2)}
          >
            {t("variant", { number: item })}
          </Button>
        ))}
      </div>
      {items.length ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {items.map((item) => (
            <article key={item.patternEn} className="rounded-md border p-4">
              <h3 className="font-semibold">{item.patternEn}</h3>
              {item.meaningVi ? (
                <p className="mt-1 text-sm text-sky-700 dark:text-sky-300">
                  {item.meaningVi}
                </p>
              ) : null}
              {item.exampleEn ? (
                <p className="text-muted-foreground mt-3 text-sm italic leading-6">
                  {item.exampleEn}
                </p>
              ) : null}
              {item.exampleVi ? (
                <p className="text-muted-foreground mt-1 text-sm leading-6">
                  {item.exampleVi}
                </p>
              ) : null}
            </article>
          ))}
        </div>
      ) : (
        <p className="text-muted-foreground py-8 text-center text-sm">
          {t("empty")}
        </p>
      )}
    </div>
  );
}
