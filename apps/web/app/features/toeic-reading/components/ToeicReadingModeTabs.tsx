import { BookOpenCheck, FileText } from "lucide-react";
import { useTranslations } from "next-intl";

import { LocalizedLink as Link } from "@/app/components/navigation/LocalizedLink";
import { cn } from "@/app/utils/cn";

type ToeicReadingModeTabsProps = {
  mode: "tests" | "grammar";
};

const modes = [
  {
    value: "tests" as const,
    href: "/learn/cert/toeic/reading?scope=full",
    icon: FileText,
  },
  {
    value: "grammar" as const,
    href: "/learn/cert/toeic/reading/grammar",
    icon: BookOpenCheck,
  },
];

export function ToeicReadingModeTabs({ mode }: ToeicReadingModeTabsProps) {
  const t = useTranslations("toeicGrammar.mode");

  return (
    <nav aria-label={t("label")} className="mt-7">
      <div className="inline-flex flex-wrap gap-1 rounded-2xl border border-emerald-100 bg-emerald-50/80 p-1 dark:border-emerald-900 dark:bg-emerald-950/40">
        {modes.map((item) => {
          const selected = item.value === mode;
          const Icon = item.icon;
          return (
            <Link
              key={item.value}
              href={item.href}
              aria-current={selected ? "page" : undefined}
              className={cn(
                "inline-flex min-h-10 items-center gap-2 rounded-xl px-4 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500",
                selected
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "text-emerald-800 hover:bg-white dark:text-emerald-200 dark:hover:bg-emerald-950"
              )}
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
              {t(item.value)}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
