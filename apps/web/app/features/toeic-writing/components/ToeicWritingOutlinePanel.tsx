"use client";

import type { ToeicWritingPartTwoCoaching } from "@repo/shared";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { Button } from "@/app/components/ui/button";

type OutlineData = Extract<ToeicWritingPartTwoCoaching, { kind: "OUTLINE" }>;

export function ToeicWritingOutlinePanel({ data }: { data: OutlineData }) {
  const t = useTranslations("toeicWriting.partTwoCoaching");
  const [level, setLevel] = useState<1 | 2>(1);
  const variant = data.variants.find((item) => item.level === level);

  if (!variant || variant.sections.length === 0) {
    return <PanelEmpty />;
  }

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
      <div className="space-y-3">
        {variant.sections.map((section) => (
          <section
            key={section.kind}
            className="overflow-hidden rounded-md border"
          >
            <h3 className="border-b bg-emerald-50 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200">
              {t(`section.${section.kind}`)}
            </h3>
            <ul className="space-y-2 p-4 text-sm leading-6">
              {section.items.map((item) => (
                <li key={item} className="flex gap-2">
                  <span className="text-emerald-600" aria-hidden="true">
                    •
                  </span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}

function PanelEmpty() {
  const t = useTranslations("toeicWriting.partTwoCoaching");
  return (
    <p className="text-muted-foreground py-8 text-center text-sm">
      {t("empty")}
    </p>
  );
}
