import { useTranslations } from "next-intl";

import { LocalizedLink as Link } from "@/app/components/navigation/LocalizedLink";
import { cn } from "@/app/utils/cn";

import type { ToeicListeningScope } from "../toeic-listening-scope";

type ToeicListeningScopeTabsProps = {
  scope: ToeicListeningScope;
};

const scopes: Array<{
  value: ToeicListeningScope;
  message: "fullTest" | "part1" | "part2" | "part3" | "part4";
}> = [
  { value: "full", message: "fullTest" },
  { value: 1, message: "part1" },
  { value: 2, message: "part2" },
  { value: 3, message: "part3" },
  { value: 4, message: "part4" },
];

export function ToeicListeningScopeTabs({
  scope,
}: ToeicListeningScopeTabsProps) {
  const t = useTranslations("toeicListening.list");

  return (
    <nav aria-label={t("scopeLabel")} className="mt-7">
      <div className="flex flex-wrap gap-2">
        {scopes.map((item) => {
          const selected = item.value === scope;
          return (
            <Link
              key={item.value}
              href={`/learn/cert/toeic/listening?mode=level&scope=${item.value}`}
              aria-current={selected ? "page" : undefined}
              className={cn(
                "inline-flex min-h-10 items-center justify-center rounded-full border px-5 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500",
                selected
                  ? "border-emerald-600 bg-emerald-600 text-white"
                  : "bg-card border-emerald-200 text-emerald-700 hover:border-emerald-500 dark:border-emerald-900 dark:text-emerald-300"
              )}
            >
              {t(item.message)}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
