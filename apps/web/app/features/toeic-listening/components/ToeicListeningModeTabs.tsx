import { Headphones, Keyboard } from "lucide-react";
import { useTranslations } from "next-intl";

import { LocalizedLink as Link } from "@/app/components/navigation/LocalizedLink";
import { cn } from "@/app/utils/cn";

type Props = { mode: "level" | "dictation" };

export function ToeicListeningModeTabs({ mode }: Props) {
  const t = useTranslations("toeicListening.mode");
  return (
    <nav aria-label={t("label")} className="mt-7">
      <div className="inline-flex flex-wrap gap-2 rounded-full border border-emerald-100 bg-emerald-50/60 p-1 dark:border-emerald-950 dark:bg-emerald-950/30">
        <Link
          href="/learn/cert/toeic/listening?mode=level&scope=full"
          aria-current={mode === "level" ? "page" : undefined}
          className={cn(
            "inline-flex min-h-10 items-center gap-2 rounded-full px-5 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500",
            mode === "level"
              ? "bg-emerald-600 text-white"
              : "text-emerald-700 hover:bg-white dark:text-emerald-300 dark:hover:bg-emerald-950"
          )}
        >
          <Headphones className="h-4 w-4" aria-hidden="true" />
          {t("level")}
        </Link>
        <Link
          href="/learn/cert/toeic/listening?mode=dictation"
          aria-current={mode === "dictation" ? "page" : undefined}
          className={cn(
            "inline-flex min-h-10 items-center gap-2 rounded-full px-5 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500",
            mode === "dictation"
              ? "bg-emerald-600 text-white"
              : "text-emerald-700 hover:bg-white dark:text-emerald-300 dark:hover:bg-emerald-950"
          )}
        >
          <Keyboard className="h-4 w-4" aria-hidden="true" />
          {t("dictation")}
        </Link>
      </div>
    </nav>
  );
}
