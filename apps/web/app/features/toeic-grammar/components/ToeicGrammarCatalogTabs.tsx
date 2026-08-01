import { BarChart3, Layers3, ListTree } from "lucide-react";
import { useTranslations } from "next-intl";

import { LocalizedLink as Link } from "@/app/components/navigation/LocalizedLink";
import { cn } from "@/app/utils/cn";

import type { ToeicGrammarCatalogTab } from "../toeic-grammar-route";

type ToeicGrammarCatalogTabsProps = {
  tab: ToeicGrammarCatalogTab;
};

const tabs = [
  { value: "topics" as const, icon: ListTree },
  { value: "sets" as const, icon: Layers3 },
  { value: "levels" as const, icon: BarChart3 },
];

export function ToeicGrammarCatalogTabs({ tab }: ToeicGrammarCatalogTabsProps) {
  const t = useTranslations("toeicGrammar.catalog.tabs");

  return (
    <nav aria-label={t("label")} className="mt-6 border-b">
      <div className="flex gap-6 overflow-x-auto">
        {tabs.map((item) => {
          const selected = tab === item.value;
          const Icon = item.icon;
          return (
            <Link
              key={item.value}
              href={`/learn/cert/toeic/reading/grammar?tab=${item.value}`}
              aria-current={selected ? "page" : undefined}
              className={cn(
                "relative inline-flex min-h-12 shrink-0 items-center gap-2 px-1 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500",
                selected
                  ? "text-emerald-700 dark:text-emerald-300"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
              {t(item.value)}
              {selected ? (
                <span className="absolute inset-x-0 bottom-0 h-0.5 rounded-full bg-emerald-600" />
              ) : null}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
