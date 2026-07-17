import { LocalizedLink as Link } from "@/app/components/navigation/LocalizedLink";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import {
  Bookmark,
  Brain,
  CalendarClock,
  Layers,
} from "lucide-react";

import { FeedWrapper } from "@/app/components/layout/FeedWrapper";
import { withLocale } from "@/app/i18n/paths";
import { getLocalizedPath } from "@/app/i18n/server";
import { cn } from "@/app/utils/cn";
import {
  getUserProgress,
} from "@/src/modules/learning/queries";
import { PRACTICE_CEFR_LEVELS } from "@/src/modules/practice/fill-blank-session";
import { getFlashcardDeckSummary } from "@/src/modules/flashcards/queries";

const deckCards = [
  {
    key: "due",
    titleKey: "dueReview",
    descriptionKey: "dueReviewDescription",
    Icon: CalendarClock,
    tone: "rose",
  },
  {
    key: "saved",
    titleKey: "savedWords",
    descriptionKey: "savedWordsDescription",
    Icon: Bookmark,
    tone: "sky",
  },
  {
    key: "weak",
    titleKey: "weakWords",
    descriptionKey: "weakWordsDescription",
    Icon: Brain,
    tone: "orange",
  },
] as const;

const getToneClasses = (tone: "rose" | "sky" | "orange" | "green") => {
  if (tone === "rose") return "border-rose-500 bg-rose-500";
  if (tone === "sky") return "border-sky-500 bg-sky-500";
  if (tone === "orange") return "border-orange-400 bg-orange-400";
  return "border-green-600 bg-green-500";
};

const FlashcardsPage = async () => {
  const t = await getTranslations("flashcards");
  const [userProgress, summary] = await Promise.all([
    getUserProgress(),
    getFlashcardDeckSummary(),
  ]);

  if (!userProgress?.activeCourse) {
    redirect(await getLocalizedPath("/courses"));
  }

  return (
    <div className="flex justify-center px-6 w-full">
      <div className="w-full max-w-[672px]">
        <FeedWrapper>
          <div className="mx-auto flex w-full max-w-3xl flex-col pb-10">
            <div className="mb-8 text-center lg:text-left">
              <h1 className="text-3xl font-bold text-neutral-800">
                {t("title")}
              </h1>
              <p className="mt-3 text-lg leading-7 text-muted-foreground">
                {t("description")}
              </p>
            </div>

            <div className="grid gap-4 lg:grid-cols-3">
              {deckCards.map((deck) => {
                const count = summary[deck.key];
                const disabled = count === 0;
                const Icon = deck.Icon;

                return (
                  <Link
                    key={deck.key}
                    href={
                      disabled
                        ? "#"
                        : withLocale(`/flashcards/session?deck=${deck.key}`)
                    }
                    aria-disabled={disabled}
                    className={cn(
                      "flex min-h-[160px] flex-col justify-between rounded-xl border-2 border-b-4 p-5 text-white transition",
                      disabled
                        ? "pointer-events-none border-slate-200 bg-slate-100 text-neutral-400"
                        : getToneClasses(deck.tone)
                    )}
                  >
                    <span>
                      <span className="mb-4 flex h-11 w-11 items-center justify-center rounded-lg bg-white/20">
                        <Icon className="h-6 w-6" />
                      </span>
                      <span className="block text-xl font-black">
                        {t(deck.titleKey)}
                      </span>
                      <span
                        className={cn(
                          "mt-2 block text-sm font-semibold leading-5",
                          disabled ? "text-neutral-500" : "text-white/90"
                        )}
                      >
                        {t(deck.descriptionKey)}
                      </span>
                    </span>
                    <span className="mt-5 text-sm font-black uppercase">
                      {t("wordCount", { count })}
                    </span>
                  </Link>
                );
              })}
            </div>

            <div className="mt-8">
              <h2 className="mb-4 text-xl font-bold text-neutral-800">
                {t("cefrDecks")}
              </h2>
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                {PRACTICE_CEFR_LEVELS.map((level) => {
                  const count = summary.levels[level];
                  const disabled = count === 0;

                  return (
                    <Link
                      key={level}
                      href={
                        disabled
                          ? "#"
                          : withLocale(`/flashcards/session?deck=${level}`)
                      }
                      aria-disabled={disabled}
                      className={cn(
                        "rounded-xl border-2 border-b-4 p-4 text-white transition",
                        disabled
                          ? "pointer-events-none border-slate-200 bg-slate-100 text-neutral-400"
                          : getToneClasses("green")
                      )}
                    >
                      <span className="flex items-center gap-2">
                        <Layers className="h-5 w-5" />
                        <span className="text-lg font-black">{level}</span>
                      </span>
                      <span className="mt-2 block text-xs font-bold uppercase opacity-85">
                        {t("wordCount", { count })}
                      </span>
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>
        </FeedWrapper>
      </div>
    </div>
  );
};

export default FlashcardsPage;
