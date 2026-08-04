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
    <nav aria-label={t("label")}>
      <div className="grid w-full grid-cols-2 gap-1.5 rounded-2xl border border-emerald-200/80 bg-emerald-50/70 p-1.5 sm:max-w-md dark:border-emerald-900 dark:bg-emerald-950/40">
        {modes.map((item) => {
          const selected = item.value === mode;
          const Icon = item.icon;
          return (
            <Link
              key={item.value}
              href={item.href}
              aria-current={selected ? "page" : undefined}
              className={cn(
                "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-3.5 text-xs font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 sm:px-4 sm:text-sm",
                selected
                  ? "bg-emerald-600 text-white shadow-xs"
                  : "text-emerald-800 hover:bg-white/80 dark:text-emerald-200 dark:hover:bg-emerald-900/60"
              )}
            >
              <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span className="whitespace-nowrap">{t(item.value)}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
