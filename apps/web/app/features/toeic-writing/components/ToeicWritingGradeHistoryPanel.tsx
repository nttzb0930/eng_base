import { ChevronDown, LoaderCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { Badge } from "@/app/components/ui/badge";
import { Button } from "@/app/components/ui/button";
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
    <details
      className="bg-card mt-5 rounded-md border p-4"
      onToggle={(event) => setOpen(event.currentTarget.open)}
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 font-semibold">
        {t("history.title")}
        <ChevronDown className="h-4 w-4" aria-hidden="true" />
      </summary>
      <div className="mt-4 space-y-3">
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
    </details>
  );
}
