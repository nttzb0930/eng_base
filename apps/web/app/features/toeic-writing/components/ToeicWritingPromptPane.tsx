"use client";

import type { ToeicWritingTaskDetail } from "@repo/shared";
import { ImageIcon, Mail } from "lucide-react";
import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";

import { Badge } from "@/app/components/ui/badge";
import { useToeicWritingImageUrl } from "@/app/features/toeic-writing/hooks/use-toeic-writing-image-url";

type ToeicWritingPromptPaneProps = {
  task: ToeicWritingTaskDetail;
};

export function ToeicWritingPromptPane({ task }: ToeicWritingPromptPaneProps) {
  return task.part === 1 ? (
    <PartOnePrompt task={task} />
  ) : (
    <PartTwoPrompt task={task} />
  );
}

function PartOnePrompt({
  task,
}: {
  task: Extract<ToeicWritingTaskDetail, { part: 1 }>;
}) {
  const t = useTranslations("toeicWriting.session");
  const locale = useLocale();
  const image = useToeicWritingImageUrl(task.id);
  const instructions =
    locale === "vi" && task.exercise.instructionsVi
      ? task.exercise.instructionsVi
      : task.exercise.instructionsEn;

  return (
    <section className="bg-card min-w-0 rounded-md border p-4 sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <ImageIcon className="h-5 w-5 text-emerald-600" aria-hidden="true" />
          <h1 className="font-semibold">{t("prompt")}</h1>
        </div>
        <Badge variant="secondary">{t("part", { part: 1 })}</Badge>
      </div>

      <p className="text-muted-foreground mt-4 text-sm leading-6">
        {instructions}
      </p>

      <div className="bg-muted/50 relative mt-5 aspect-[4/3] overflow-hidden rounded-md border">
        {image.url ? (
          <Image
            src={image.url}
            alt={task.title}
            fill
            unoptimized
            sizes="(max-width: 768px) 100vw, 50vw"
            className="object-contain"
          />
        ) : image.error ? (
          <div className="text-muted-foreground flex h-full items-center justify-center px-6 text-center text-sm">
            {t("imageError")}
          </div>
        ) : (
          <div
            className="flex h-full items-center justify-center"
            role="status"
          >
            <div className="h-8 w-8 animate-pulse rounded-md bg-emerald-100 dark:bg-emerald-950" />
            <span className="sr-only">{t("imageLoading")}</span>
          </div>
        )}
      </div>

      <div className="mt-5">
        <h2 className="text-sm font-semibold">{t("requiredWords")}</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {task.exercise.requiredWords.map((word) => (
            <Badge key={word.en} variant="outline" className="gap-1.5">
              <span>{word.en}</span>
              {word.vi ? (
                <span className="text-muted-foreground font-normal">
                  · {word.vi}
                </span>
              ) : null}
            </Badge>
          ))}
        </div>
      </div>
    </section>
  );
}

function PartTwoPrompt({
  task,
}: {
  task: Extract<ToeicWritingTaskDetail, { part: 2 }>;
}) {
  const t = useTranslations("toeicWriting.session");

  const promptEn = task.exercise.promptEn.replace(/\\n/gu, "\n");
  const promptVi = task.exercise.promptVi?.replace(/\\n/gu, "\n") ?? "";

  return (
    <section className="bg-card min-w-0 rounded-md border p-4 sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Mail className="h-5 w-5 text-emerald-600" aria-hidden="true" />
          <h1 className="font-semibold">{t("emailPrompt")}</h1>
        </div>
        <Badge variant="secondary">{t("part", { part: 2 })}</Badge>
      </div>

      <div className="bg-muted/50 mt-5 whitespace-pre-wrap rounded-md border p-4 text-sm leading-7">
        {promptEn}
      </div>
      {promptVi ? <div className="text-muted-foreground mt-2 text-sm">{promptVi}</div> : null}

      <div className="mt-6">
        <h2 className="text-sm font-semibold">{t("requirements")}</h2>
        <ol className="mt-3 space-y-3">
          {task.exercise.requirements.map((requirement) => (
            <li
              key={requirement.order}
              className="flex gap-3 rounded-md border p-3 text-sm leading-6"
            >
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-emerald-100 text-xs font-semibold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">
                {requirement.order}
              </span>
              <span>
                {requirement.textEn}
                {requirement.textVi ? (
                  <span className="text-muted-foreground mt-1 block">
                    {requirement.textVi}
                  </span>
                ) : null}
              </span>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
