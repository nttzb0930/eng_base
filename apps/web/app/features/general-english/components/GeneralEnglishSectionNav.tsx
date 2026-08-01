"use client";

import { Award, BookOpenText, Dumbbell, Tag } from "lucide-react";
import { useTranslations } from "next-intl";

import { LocalizedLink as Link } from "@/app/components/navigation/LocalizedLink";
import { withLocale } from "@/app/i18n/paths";
import { cn } from "@/app/utils/cn";

export type GeneralEnglishSection = "cefr" | "topics" | "practice" | "reading";

type GeneralEnglishSectionNavProps = {
  active: GeneralEnglishSection;
  levelCount?: number;
  topicCount?: number;
};

const sections = [
  { key: "cefr", href: "/learn/level", Icon: Award },
  { key: "topics", href: "/learn/topic", Icon: Tag },
  { key: "practice", href: "/practice", Icon: Dumbbell },
  { key: "reading", href: "/reading", Icon: BookOpenText },
] as const;

export function GeneralEnglishSectionNav({
  active,
  levelCount,
  topicCount,
}: GeneralEnglishSectionNavProps) {
  const t = useTranslations("learn.generalNavigation");

  return (
    <nav
      aria-label={t("label")}
      className="border-border/80 bg-background mb-7 overflow-x-auto rounded-xl border p-1.5 shadow-sm"
    >
      <div className="flex min-w-max items-center gap-1.5">
        {sections.map(({ key, href, Icon }) => {
          const selected = active === key;
          const count =
            key === "cefr"
              ? levelCount
              : key === "topics"
                ? topicCount
                : undefined;

          return (
            <Link
              key={key}
              href={withLocale(href)}
              aria-current={selected ? "page" : undefined}
              prefetch
              className={cn(
                "group inline-flex min-h-10 shrink-0 items-center gap-2 rounded-md px-4 py-2 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2",
                selected
                  ? "bg-blue-600 text-white shadow-sm hover:bg-blue-700"
                  : "text-muted-foreground hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-950/50 dark:hover:text-blue-400"
              )}
            >
              <Icon className="h-3.5 w-3.5 stroke-[2.4]" aria-hidden="true" />
              {t(key)}
              {typeof count === "number" ? (
                <span
                  className={cn(
                    "tabular rounded-md px-1.5 py-0.5 text-[11px] font-semibold transition-colors",
                    selected
                      ? "bg-white/20 text-white"
                      : "bg-muted-foreground/10 text-muted-foreground group-hover:bg-blue-100 group-hover:text-blue-600 dark:group-hover:bg-blue-900/40 dark:group-hover:text-blue-400"
                  )}
                >
                  {count}
                </span>
              ) : null}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
