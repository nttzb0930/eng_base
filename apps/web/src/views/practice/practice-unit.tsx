import { NotebookText } from "lucide-react";
import { LocalizedLink as Link } from "@/src/components/localized-link";
import { useTranslations } from "next-intl";

import { Button } from "@/src/components/ui/button";
import { withLocale } from "@/src/lib/i18n/paths";
import type { PracticeCefrLevel } from "@/src/modules/practice/fill-blank-session";

import { PracticeLessonButton } from "./practice-lesson-button";

type PracticeUnitProps = {
  level: PracticeCefrLevel;
  modePath: "fill-blank" | "listening" | "dictation";
  title: string;
  description: string;
  words: number;
  lessons: number;
  unlockedLessons: number;
};

export const PracticeUnit = ({
  level,
  modePath,
  title,
  description,
  words,
  lessons,
  unlockedLessons,
}: PracticeUnitProps) => {
  const t = useTranslations("practice");

  return (
    <>
      <div className="flex w-full items-center justify-between rounded-xl bg-green-500 p-5 text-white">
        <div className="space-y-2.5">
          <h2 className="text-2xl font-bold">
            {level} {title}
          </h2>
          <p className="text-lg">{description}</p>
          <p className="text-sm font-bold uppercase text-white/80">
            {t("wordsWithLessons", { words, lessons })}
          </p>
        </div>

        {unlockedLessons > 0 && (
          <Button
            asChild
            size="lg"
            variant="secondary"
            className="hidden border-2 border-b-4 active:border-b-2 xl:flex"
          >
            <Link href={withLocale(`/practice/${modePath}?level=${level}&lesson=1`)}>
              <NotebookText className="mr-2" />
              {t("start")}
            </Link>
          </Button>
        )}
      </div>

      {lessons === 0 || unlockedLessons === 0 ? (
        <div className="rounded-lg border-2 border-dashed p-8 text-center">
          <p className="font-bold text-neutral-700">
            {lessons === 0 ? t("noExamples") : t("levelLocked")}
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            {lessons === 0
              ? t("runEnrichment")
              : t("completePreviousLevel")}
          </p>
        </div>
      ) : (
        <div className="relative flex flex-col items-center">
          {Array.from({ length: lessons }).map((_, index) => (
            <PracticeLessonButton
              key={`${level}-${index + 1}`}
              level={level}
              modePath={modePath}
              lessonNumber={index + 1}
              index={index}
              totalCount={lessons - 1}
              locked={index + 1 > unlockedLessons}
            />
          ))}
        </div>
      )}
    </>
  );
};
