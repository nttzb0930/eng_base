"use client";

import { Crown, Lock, Star } from "lucide-react";
import { LocalizedLink as Link } from "@/app/components/navigation/LocalizedLink";
import { useTranslations } from "next-intl";

import { Button } from "@/app/components/ui/button";
import { cn } from "@/app/utils/cn";
import type { PracticeCefrLevel } from "@/src/modules/practice/fill-blank-session";

type PracticeLessonButtonProps = {
  level: PracticeCefrLevel;
  modePath: "fill-blank" | "listening" | "dictation";
  lessonNumber: number;
  index: number;
  totalCount: number;
  locked?: boolean;
};

export const PracticeLessonButton = ({
  level,
  modePath,
  lessonNumber,
  index,
  totalCount,
  locked = false,
}: PracticeLessonButtonProps) => {
  const t = useTranslations("practice");
  const cycleLength = 8;
  const cycleIndex = index % cycleLength;

  let indentationLevel;

  if (cycleIndex <= 2) indentationLevel = cycleIndex;
  else if (cycleIndex <= 4) indentationLevel = 4 - cycleIndex;
  else if (cycleIndex <= 6) indentationLevel = 4 - cycleIndex;
  else indentationLevel = cycleIndex - 8;

  const rightPosition = indentationLevel * 40;
  const isFirst = index === 0;
  const isLast = index === totalCount;
  const Icon = locked ? Lock : isLast ? Crown : Star;
  const href = `/practice/${modePath}?level=${level}&lesson=${lessonNumber}`;

  return (
    <Link
      href={locked ? "#" : href}
      aria-disabled={locked}
      style={{ pointerEvents: locked ? "none" : "auto" }}
    >
      <div
        className="relative"
        style={{
          right: `${rightPosition}px`,
          marginTop: isFirst ? 60 : 24,
        }}
      >
        {isFirst && (
          <div className="absolute -top-6 left-2.5 z-10 animate-bounce rounded-xl border-2 bg-white px-3 py-2.5 font-bold uppercase tracking-wide text-green-500">
            {t("start")}
            <div
              className="absolute -bottom-2 left-1/2 h-0 w-0 -translate-x-1/2 transform border-x-8 border-t-8 border-x-transparent"
              aria-hidden
            />
          </div>
        )}

        <Button
          size="rounded"
          variant={locked ? "locked" : "secondary"}
          className="h-[70px] w-[70px] border-b-8"
        >
          <Icon
            className={cn(
              "h-10 w-10",
              locked
                ? "fill-neutral-400 stroke-neutral-400 text-neutral-400"
                : "fill-primary-foreground text-primary-foreground",
              !locked && isLast && "fill-none stroke-[4]"
            )}
          />
        </Button>
      </div>
    </Link>
  );
};
