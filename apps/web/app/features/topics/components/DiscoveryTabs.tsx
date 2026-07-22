"use client";

import { Award, GraduationCap, Tag } from "lucide-react";
import { useTranslations } from "next-intl";
import { LocalizedLink as Link } from "@/app/components/navigation/LocalizedLink";
import { withLocale } from "@/app/i18n/paths";
import { cn } from "@/app/utils/cn";

type DiscoveryTabsProps = {
  active: "learn" | "topics" | "certs";
  onSelectMode?: (mode: "learn" | "certs" | "topics") => void;
  learnLabel?: string;
  topicsLabel?: string;
  certsLabel?: string;
  levelCount?: number;
  topicCount?: number;
  certCount?: number;
};

const tabs = [
  { key: "learn", href: "/learn/level", Icon: Award },
  { key: "certs", href: "/learn/cert", Icon: GraduationCap },
  { key: "topics", href: "/learn/topic", Icon: Tag },
] as const;

export function DiscoveryTabs({
  active,
  onSelectMode,
  learnLabel,
  topicsLabel,
  certsLabel,
  levelCount,
  topicCount,
  certCount = 4,
}: DiscoveryTabsProps) {
  const t = useTranslations("topics");

  const fallbackLabels = {
    learn: t("byLevel"),
    certs: t("byCert"),
    topics: t("byTopic"),
  };

  return (
    <nav
      aria-label="Chế độ học tập"
      className="mb-7 inline-flex flex-wrap items-center gap-1.5 rounded-xl border border-border/80 bg-background p-1.5 shadow-sm"
    >
      {tabs.map(({ key, href, Icon }) => {
        const selected = active === key;
        const displayLabel =
          key === "learn"
            ? learnLabel ?? fallbackLabels.learn
            : key === "topics"
              ? topicsLabel ?? fallbackLabels.topics
              : certsLabel ?? fallbackLabels.certs;

        const count =
          key === "learn" ? levelCount : key === "topics" ? topicCount : certCount;

        const getTabStyles = (tabKey: "learn" | "certs" | "topics", isSelected: boolean) => {
          if (isSelected) {
            if (tabKey === "learn") return "bg-blue-600 text-white shadow-sm hover:bg-blue-700";
            if (tabKey === "certs") return "bg-emerald-600 text-white shadow-sm hover:bg-emerald-700";
            return "bg-orange-500 text-white shadow-sm hover:bg-orange-600";
          }
          if (tabKey === "learn") {
            return "text-muted-foreground hover:bg-blue-50 dark:hover:bg-blue-950/50 hover:text-blue-600 dark:hover:text-blue-400";
          }
          if (tabKey === "certs") {
            return "text-muted-foreground hover:bg-emerald-50 dark:hover:bg-emerald-950/50 hover:text-emerald-600 dark:hover:text-emerald-400";
          }
          return "text-muted-foreground hover:bg-orange-50 dark:hover:bg-orange-950/50 hover:text-orange-600 dark:hover:text-orange-400";
        };

        const getBadgeStyles = (tabKey: "learn" | "certs" | "topics", isSelected: boolean) => {
          if (isSelected) return "bg-white/20 text-white";
          if (tabKey === "learn") {
            return "bg-muted-foreground/10 text-muted-foreground group-hover:bg-blue-100 dark:group-hover:bg-blue-900/40 group-hover:text-blue-600 dark:group-hover:text-blue-400";
          }
          if (tabKey === "certs") {
            return "bg-muted-foreground/10 text-muted-foreground group-hover:bg-emerald-100 dark:group-hover:bg-emerald-900/40 group-hover:text-emerald-600 dark:group-hover:text-emerald-400";
          }
          return "bg-muted-foreground/10 text-muted-foreground group-hover:bg-orange-100 dark:group-hover:bg-orange-900/40 group-hover:text-orange-600 dark:group-hover:text-orange-400";
        };

        return (
          <Link
            key={key}
            href={withLocale(href)}
            aria-current={selected ? "page" : undefined}
            prefetch={true}
            onClick={(e) => {
              if (onSelectMode) {
                e.preventDefault();
                onSelectMode(key);
              }
            }}
            className={cn(
              "group inline-flex min-h-10 items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-all duration-200 cursor-pointer",
              getTabStyles(key, selected)
            )}
          >
            <Icon className="h-3.5 w-3.5 stroke-[2.4]" aria-hidden="true" />
            {displayLabel}
            {typeof count === "number" && (
              <span
                className={cn(
                  "tabular rounded-md px-1.5 py-0.5 text-[11px] font-semibold transition-colors duration-200",
                  getBadgeStyles(key, selected)
                )}
              >
                {count}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
