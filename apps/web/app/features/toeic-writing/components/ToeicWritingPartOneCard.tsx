"use client";

import type { ToeicWritingPartOneTaskSummary } from "@repo/shared";
import { ArrowRight, ImageOff } from "lucide-react";
import Image from "next/image";
import { useTranslations } from "next-intl";

import { LocalizedLink as Link } from "@/app/components/navigation/LocalizedLink";
import { useNearViewport } from "@/app/features/toeic-writing/hooks/use-near-viewport";
import { useToeicWritingImageUrl } from "@/app/features/toeic-writing/hooks/use-toeic-writing-image-url";

type ToeicWritingPartOneCardProps = {
  task: ToeicWritingPartOneTaskSummary;
};

export function ToeicWritingPartOneCard({
  task,
}: ToeicWritingPartOneCardProps) {
  const t = useTranslations("toeicWriting.card");
  const { ref, isNearViewport } = useNearViewport<HTMLElement>();
  const image = useToeicWritingImageUrl(task.id, isNearViewport);
  const action = task.submitted
    ? t("review")
    : task.hasDraft
      ? t("continue")
      : t("start");

  return (
    <article
      ref={ref}
      className="bg-card group flex min-w-0 flex-col overflow-hidden rounded-md border transition-colors hover:border-emerald-500/60"
    >
      <div className="bg-muted/50 relative aspect-[4/3] overflow-hidden border-b">
        {image.url ? (
          <Image
            src={image.url}
            alt={t("imageAlt")}
            fill
            unoptimized
            sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 25vw"
            className="object-cover transition-transform duration-300 group-hover:scale-[1.02]"
          />
        ) : image.error ? (
          <div className="text-muted-foreground flex h-full flex-col items-center justify-center gap-2 px-5 text-center text-sm">
            <ImageOff className="h-6 w-6" aria-hidden="true" />
            <span>{t("imageError")}</span>
          </div>
        ) : (
          <div className="flex h-full items-center justify-center" role="status">
            <div className="h-full w-full animate-pulse bg-slate-100 dark:bg-slate-900" />
            <span className="sr-only">{t("imageLoading")}</span>
          </div>
        )}
      </div>

      <div className="flex flex-1 items-center justify-between gap-3 p-3">
        <div className="flex min-w-0 flex-wrap gap-2">
          {task.requiredWords.map((word) => (
            <span
              key={`${task.id}-${word.en}`}
              className="max-w-full truncate rounded-md border bg-white px-2.5 py-1 font-mono text-xs dark:bg-slate-950"
              title={word.vi ?? word.en}
            >
              {word.en}
            </span>
          ))}
        </div>
        <Link
          href={`/toeic/writing/part-1/${task.id}`}
          className="inline-flex min-h-10 shrink-0 items-center justify-center gap-1.5 rounded-md bg-emerald-600 px-3 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
        >
          {action}
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>
    </article>
  );
}
