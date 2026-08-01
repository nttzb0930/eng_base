import type { ToeicGrammarSubtopicSummary } from "@repo/shared";
import { useLocale, useTranslations } from "next-intl";

import { LocalizedLink as Link } from "@/app/components/navigation/LocalizedLink";

type ToeicGrammarSubtopicNavigationProps = {
  topicTitle: string;
  subtopics: ToeicGrammarSubtopicSummary[];
  selectedTarget: string;
};

function subtopicTitle(
  subtopic: ToeicGrammarSubtopicSummary,
  locale: string
) {
  return locale === "vi"
    ? subtopic.titleVi
    : (subtopic.titleEn ?? subtopic.titleVi);
}

function subtopicHref(target: string) {
  return `/learn/cert/toeic/reading/grammar/${encodeURIComponent(target)}`;
}

export function ToeicGrammarSubtopicNavigation({
  topicTitle,
  subtopics,
  selectedTarget,
}: ToeicGrammarSubtopicNavigationProps) {
  const locale = useLocale();
  const t = useTranslations("toeicGrammar.lesson");

  const items = subtopics.map((subtopic, index) => {
    const active = subtopic.target === selectedTarget;
    return { subtopic, index, active };
  });

  return (
    <>
      <nav aria-label={t("subtopics")} className="lg:hidden">
        <p className="text-muted-foreground mb-3 text-xs font-semibold uppercase tracking-[0.16em]">
          {topicTitle}
        </p>
        <div className="-mx-1 flex gap-3 overflow-x-auto px-1 pb-3">
          {items.map(({ subtopic, index, active }) => (
            <Link
              key={subtopic.target}
              href={subtopicHref(subtopic.target)}
              aria-current={active ? "page" : undefined}
              className={`min-w-[220px] rounded-xl border px-4 py-3 transition-colors ${active ? "border-sky-500 bg-sky-500 text-white" : "bg-card hover:border-sky-300"}`}
            >
              <span className="text-xs font-bold">
                {String(index + 1).padStart(2, "0")}
              </span>
              <span className="mt-1 block text-sm font-semibold">
                {subtopicTitle(subtopic, locale)}
              </span>
              <span
                className={`mt-1 block text-xs ${active ? "text-sky-50" : "text-muted-foreground"}`}
              >
                {t("questions", { count: subtopic.questionCount })}
              </span>
            </Link>
          ))}
        </div>
      </nav>

      <aside className="bg-card hidden lg:block h-fit rounded-2xl border p-3 shadow-sm lg:sticky lg:top-24">
        <p className="px-3 pb-3 pt-2 text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700 dark:text-emerald-300">
          {topicTitle}
        </p>
        <nav aria-label={t("subtopics")}>
          <ol className="space-y-1.5">
            {items.map(({ subtopic, index, active }) => (
              <li key={subtopic.target}>
                <Link
                  href={subtopicHref(subtopic.target)}
                  aria-current={active ? "page" : undefined}
                  className={`flex gap-3 rounded-xl px-3 py-3 transition-colors ${active ? "bg-sky-500 text-white" : "hover:bg-muted"}`}
                >
                  <span
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-bold ${active ? "bg-white/20" : "bg-sky-50 text-sky-700 dark:bg-sky-950 dark:text-sky-300"}`}
                  >
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold leading-5">
                      {subtopicTitle(subtopic, locale)}
                    </span>
                    <span
                      className={`mt-1 block text-xs ${active ? "text-sky-50" : "text-muted-foreground"}`}
                    >
                      {t("questions", { count: subtopic.questionCount })}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ol>
        </nav>
      </aside>
    </>
  );
}
