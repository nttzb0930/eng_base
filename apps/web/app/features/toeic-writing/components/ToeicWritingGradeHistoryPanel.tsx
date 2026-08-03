import { ChevronDown, History, LoaderCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { Badge } from "@/app/components/ui/badge";
import { Button } from "@/app/components/ui/button";
import { cn } from "@/app/utils/cn";
import { useToeicWritingGradeHistory } from "../hooks/use-toeic-writing";

function getHistoryScoreBadge(score: number, maxScore: number) {
  const percentage = score / maxScore;
  if (percentage >= 0.9) {
    return {
      label: `${score}/${maxScore} • Hoàn hảo`,
      badgeClass:
        "bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800",
    };
  }
  if (percentage >= 0.6) {
    return {
      label: `${score}/${maxScore} • Khá`,
      badgeClass:
        "bg-sky-100 text-sky-800 border-sky-300 dark:bg-sky-950/60 dark:text-sky-300 dark:border-sky-800",
    };
  }
  return {
    label: `${score}/${maxScore} • Cần cải thiện`,
    badgeClass:
      "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800",
  };
}

export function ToeicWritingGradeHistoryPanel({
  taskId,
  maxScore = 3,
}: {
  taskId: number;
  maxScore?: 3 | 4;
}) {
  const t = useTranslations("toeicWriting.partOneGrading");
  const [open, setOpen] = useState(false);
  const history = useToeicWritingGradeHistory(taskId, open);
  const items = history.data?.pages.flatMap((page) => page.items) ?? [];

  return (
    <div className="bg-card select-none rounded-md border p-4 shadow-sm">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="flex w-full cursor-pointer items-center justify-between gap-3 rounded-sm text-left font-semibold text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
      >
        <div className="flex items-center gap-2">
          <History className="h-4 w-4 text-emerald-600" aria-hidden="true" />
          <span>{t("history.title")}</span>
        </div>
        <ChevronDown
          className={cn(
            "h-4 w-4 text-muted-foreground transition-transform duration-300",
            open && "rotate-180"
          )}
          aria-hidden="true"
        />
      </button>

      <div
        className={cn(
          "grid transition-[grid-template-rows] duration-300 ease-in-out",
          open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        )}
      >
        <div className="overflow-hidden">
          <div className="mt-4 space-y-3 pt-1">
            {history.isLoading ? (
              <LoaderCircle
                className="h-5 w-5 animate-spin"
                aria-label={t("history.loading")}
              />
            ) : items.length === 0 ? (
              <p className="text-muted-foreground text-sm">{t("history.empty")}</p>
            ) : (
              items.map((item) => {
                const badgeInfo = getHistoryScoreBadge(item.score, maxScore);
                return (
                  <article
                    key={item.id}
                    className="bg-card rounded-lg border p-3.5 shadow-2xs transition-colors"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/50 pb-2.5">
                      <Badge
                        variant="outline"
                        className={cn("px-2.5 py-0.5 text-xs font-semibold border", badgeInfo.badgeClass)}
                      >
                        {badgeInfo.label}
                      </Badge>
                      <time className="text-muted-foreground text-xs font-medium">
                        {new Intl.DateTimeFormat("vi-VN", {
                          hour: "2-digit",
                          minute: "2-digit",
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                        }).format(new Date(item.createdAt))}
                      </time>
                    </div>
                    <div className="mt-2.5">
                      <span className="text-muted-foreground mb-1 block text-[11px] font-medium tracking-wide uppercase">
                        {t("yourSentence")}
                      </span>
                      <p className="bg-slate-50 border-slate-200/80 text-foreground dark:bg-slate-900/60 dark:border-slate-800 rounded-md border p-2.5 text-sm font-medium leading-relaxed">
                        {item.responseText}
                      </p>
                    </div>
                  </article>
                );
              })
            )}
            {history.hasNextPage ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={history.isFetchingNextPage}
                onClick={() => void history.fetchNextPage()}
                className="w-full rounded-md"
              >
                {history.isFetchingNextPage
                  ? t("history.loading")
                  : t("history.loadMore")}
              </Button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
