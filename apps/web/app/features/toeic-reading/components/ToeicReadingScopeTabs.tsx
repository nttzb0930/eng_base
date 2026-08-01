import { useTranslations } from "next-intl";

import { LocalizedLink as Link } from "@/app/components/navigation/LocalizedLink";
import { cn } from "@/app/utils/cn";

import type { ToeicReadingScope } from "../toeic-reading-scope";

type ToeicReadingScopeTabsProps = {
  scope: ToeicReadingScope;
};

const scopes: Array<{
  value: ToeicReadingScope;
  message: "fullTest" | "part5" | "part6" | "part7";
}> = [
  { value: "full", message: "fullTest" },
  { value: 5, message: "part5" },
  { value: 6, message: "part6" },
  { value: 7, message: "part7" },
];

export function ToeicReadingScopeTabs({ scope }: ToeicReadingScopeTabsProps) {
  const t = useTranslations("toeicReading.list");

  return (
    <nav aria-label={t("scopeLabel")} className="mt-7">
      <div className="flex flex-wrap gap-2">
        {scopes.map((item) => {
          const selected = item.value === scope;
          return (
            <Link
              key={item.value}
              href={`/learn/cert/toeic/reading?scope=${item.value}`}
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
