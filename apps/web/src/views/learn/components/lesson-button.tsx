"use client";

import { ArrowRight, Check, Crown, LockKeyhole, Play } from "lucide-react";
import { useTranslations } from "next-intl";
import { LocalizedLink as Link } from "@/app/components/navigation/LocalizedLink";
import { Progress } from "@/app/components/ui/progress";
import { withLocale } from "@/app/i18n/paths";
import { cn } from "@/app/utils/cn";

type LessonButtonProps = {
  id: number;
  index: number;
  totalCount: number;
  locked?: boolean;
  current?: boolean;
  percentage: number;
};

export const LessonButton = ({
  id,
  index,
  totalCount,
  locked,
  current,
  percentage,
}: LessonButtonProps) => {
  const t = useTranslations("learn");
  const isCompleted = !current && !locked;
  const isLast = index === totalCount;
  const href = isCompleted ? withLocale(`/lesson/${id}`) : withLocale("/lesson");
  const Icon = locked ? LockKeyhole : isCompleted ? Check : isLast ? Crown : Play;
  const safePercentage = Number.isNaN(percentage) ? 0 : percentage;

  const content = (
    <>
      <div className="flex items-start justify-between gap-3">
        <span
          className={cn(
            "grid h-10 w-10 place-items-center rounded-xl",
            locked
              ? "bg-muted text-muted-foreground"
              : current
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-secondary-foreground"
          )}
        >
          <Icon className="h-5 w-5" aria-hidden="true" />
        </span>
        <span className="tabular text-xs font-semibold text-muted-foreground">
          {Math.round(safePercentage)}%
        </span>
      </div>
      <p className="mt-4 text-base font-semibold text-foreground">
        {t("lessonLabel", { number: index + 1 })}
      </p>
      <p className="mt-1 text-xs font-medium text-muted-foreground">
        {locked ? t("locked") : current ? t("continueLearning") : t("completed")}
      </p>
      <div className="mt-4 flex items-center gap-3">
        <Progress value={safePercentage} className="h-1.5" />
        {!locked && (
          <ArrowRight className="h-4 w-4 shrink-0 text-primary transition-transform group-hover:translate-x-1" aria-hidden="true" />
        )}
      </div>
    </>
  );

  const className = cn(
    "group rounded-2xl border bg-card p-4 transition duration-200",
    current && "border-primary/30 ring-1 ring-primary/20",
    locked
      ? "cursor-not-allowed opacity-55"
      : "hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-lift"
  );

  return locked ? (
    <div className={className} aria-disabled="true">
      {content}
    </div>
  ) : (
    <Link
      id={current ? "active-lesson" : undefined}
      href={href}
      className={className}
      aria-current={current ? "step" : undefined}
    >
      {content}
    </Link>
  );
};
