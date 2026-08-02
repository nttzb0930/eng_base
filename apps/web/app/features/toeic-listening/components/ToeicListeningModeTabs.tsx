import { Headphones, Keyboard } from "lucide-react";
import { useTranslations } from "next-intl";

import { LocalizedLink as Link } from "@/app/components/navigation/LocalizedLink";
import { cn } from "@/app/utils/cn";

type Props = { mode: "level" | "dictation" };

export function ToeicListeningModeTabs({ mode }: Props) {
  const t = useTranslations("toeicListening.mode");
  return (
    <nav aria-label={t("label")}>
      <div className="grid w-full grid-cols-2 gap-1.5 rounded-2xl border border-emerald-200/80 bg-emerald-50/70 p-1.5 sm:max-w-md dark:border-emerald-900 dark:bg-emerald-950/40">
        <Link
          href="/learn/cert/toeic/listening?mode=level&scope=full"
          aria-current={mode === "level" ? "page" : undefined}
          className={cn(
            "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-3.5 text-xs font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 sm:px-4 sm:text-sm",
            mode === "level"
              ? "bg-emerald-600 text-white shadow-xs"
              : "text-emerald-800 hover:bg-white/80 dark:text-emerald-200 dark:hover:bg-emerald-900/60"
          )}
        >
          <Headphones className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span className="whitespace-nowrap">{t("level")}</span>
        </Link>
        <Link
          href="/learn/cert/toeic/listening?mode=dictation"
          aria-current={mode === "dictation" ? "page" : undefined}
          className={cn(
            "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-3.5 text-xs font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 sm:px-4 sm:text-sm",
            mode === "dictation"
              ? "bg-emerald-600 text-white shadow-xs"
              : "text-emerald-800 hover:bg-white/80 dark:text-emerald-200 dark:hover:bg-emerald-900/60"
          )}
        >
          <Keyboard className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span className="whitespace-nowrap">{t("dictation")}</span>
        </Link>
      </div>
    </nav>
  );
}
