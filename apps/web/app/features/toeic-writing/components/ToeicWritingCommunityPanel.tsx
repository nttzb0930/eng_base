"use client";

import type { ToeicWritingCommunityItem } from "@repo/shared";
import { RotateCcw } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

import { Button } from "@/app/components/ui/button";

type ToeicWritingCommunityPanelProps = {
  items: ToeicWritingCommunityItem[];
  loading: boolean;
  error: boolean;
  hasMore: boolean;
  loadingMore: boolean;
  restoringId: number | null;
  onRetry(): void;
  onLoadMore(): void;
  onRestore(item: ToeicWritingCommunityItem): void;
};

export function ToeicWritingCommunityPanel({
  items,
  loading,
  error,
  hasMore,
  loadingMore,
  restoringId,
  onRetry,
  onLoadMore,
  onRestore,
}: ToeicWritingCommunityPanelProps) {
  const t = useTranslations("toeicWriting.partTwoCoaching");
  const locale = useLocale();

  if (loading) return <PanelSkeleton />;
  if (error) {
    return (
      <div className="rounded-md border border-rose-200 p-5 text-center dark:border-rose-900">
        <p className="text-sm text-rose-700 dark:text-rose-300">
          {t("loadError")}
        </p>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="mt-3 gap-2 rounded-md"
          onClick={onRetry}
        >
          <RotateCcw className="h-4 w-4" aria-hidden="true" />
          {t("retry")}
        </Button>
      </div>
    );
  }
  if (items.length === 0) {
    return (
      <p className="text-muted-foreground py-8 text-center text-sm">
        {t("communityEmpty")}
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <article key={item.submissionId} className="rounded-md border p-4">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            <span className="font-semibold text-emerald-700 dark:text-emerald-300">
              {item.authorLabel}
            </span>
            <time className="text-muted-foreground" dateTime={item.sharedAt}>
              {new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(
                new Date(item.sharedAt)
              )}
            </time>
          </div>
          <p className="mt-3 whitespace-pre-wrap text-sm leading-7">
            {item.responseText}
          </p>
          <div className="mt-4 flex justify-end">
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="rounded-md"
              disabled={restoringId !== null}
              onClick={() => onRestore(item)}
            >
              {restoringId === item.submissionId
                ? t("restoring")
                : t("restore")}
            </Button>
          </div>
        </article>
      ))}
      {hasMore ? (
        <div className="flex justify-center pt-2">
          <Button
            type="button"
            variant="outline"
            className="rounded-md"
            disabled={loadingMore}
            onClick={onLoadMore}
          >
            {loadingMore ? t("loadingMore") : t("loadMore")}
          </Button>
        </div>
      ) : null}
    </div>
  );
}

function PanelSkeleton() {
  return (
    <div className="space-y-3" role="status">
      {[0, 1].map((item) => (
        <div key={item} className="animate-pulse rounded-md border p-4">
          <div className="bg-muted h-4 w-32 rounded-md" />
          <div className="bg-muted mt-4 h-16 rounded-md" />
        </div>
      ))}
    </div>
  );
}
