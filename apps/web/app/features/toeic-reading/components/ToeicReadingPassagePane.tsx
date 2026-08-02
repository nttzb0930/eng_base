"use client";

import { useState } from "react";
import type { ToeicReadingStimulus } from "@repo/shared";
import { ChevronDown, FileText } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/app/components/ui/button";
import { cn } from "@/app/utils/cn";

import { ToeicStimulus } from "./ToeicStimulus";

export function ToeicReadingPassagePane({
  stimulus,
}: {
  stimulus: ToeicReadingStimulus | null;
}) {
  const t = useTranslations("toeicReading");
  const [expanded, setExpanded] = useState(true);

  return (
    <aside className="min-w-0" aria-label={t("session.stimulus")}>
      <Button
        type="button"
        variant="outline"
        aria-expanded={expanded}
        onClick={() => setExpanded((current) => !current)}
        className="mb-3 w-full justify-between rounded-md lg:hidden"
      >
        <span className="inline-flex items-center gap-2">
          <FileText className="h-4 w-4" aria-hidden="true" />
          {expanded ? t("practice.hidePassage") : t("practice.showPassage")}
        </span>
        <ChevronDown
          className={cn(
            "h-4 w-4 transition-transform duration-200",
            expanded && "rotate-180"
          )}
          aria-hidden="true"
        />
      </Button>

      <div className={cn(!expanded && "hidden", "lg:block")}>
        {stimulus ? (
          <ToeicStimulus stimulus={stimulus} />
        ) : (
          <div className="text-muted-foreground rounded-xl border border-dashed p-6 text-sm">
            {t("session.stimulusUnavailable")}
          </div>
        )}
      </div>
    </aside>
  );
}
