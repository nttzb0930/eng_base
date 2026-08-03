import { ChevronDown, History, LoaderCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { Badge } from "@/app/components/ui/badge";
import { Button } from "@/app/components/ui/button";
import { cn } from "@/app/utils/cn";
import { useToeicWritingGradeHistory } from "../hooks/use-toeic-writing";

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
    <div className="bg-card rounded-md border p-4 shadow-sm select-none">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="flex w-full cursor-pointer items-center justify-between gap-3 text-left font-semibold text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 rounded-sm"
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
              items.map((item) => (
                <article key={item.id} className="rounded-md border p-3">
                  <div className="flex items-center justify-between gap-3">
                    <Badge variant="secondary">
                      {item.score}/{maxScore}
                    </Badge>
                    <time className="text-muted-foreground text-xs">
                      {new Intl.DateTimeFormat(undefined, {
                        dateStyle: "medium",
                        timeStyle: "short",
                      }).format(new Date(item.createdAt))}
                    </time>
                  </div>
                  <p className="mt-2 text-sm leading-6">{item.responseText}</p>
                </article>
              ))
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
