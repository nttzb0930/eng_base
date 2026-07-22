"use client";

import { ArrowRight, ChevronLeft, GraduationCap, Lock, Plus } from "lucide-react";
import { useTranslations } from "next-intl";

import { CoursesPageSkeleton } from "@/app/components/feedback/RouteSkeletons";
import { FeedWrapper } from "@/app/components/layout/FeedWrapper";
import { LocalizedLink as Link } from "@/app/components/navigation/LocalizedLink";
import { useCourseSelection } from "@/app/features/courses/hooks/use-course-selection";
import { useCourses } from "@/app/features/courses/hooks/use-courses";
import { useUserProgress } from "@/app/features/progress/hooks/use-user-progress";
import { DiscoveryTabs } from "@/app/features/topics/components/DiscoveryTabs";
import { withLocale } from "@/app/i18n/paths";

type CoursesViewProps = {
  onSelectMode?: (mode: "learn" | "certs" | "topics") => void;
};

export function CoursesView({ onSelectMode }: CoursesViewProps) {
  const t = useTranslations("topics");
  const nav = useTranslations("navigation");
  const learnT = useTranslations("learn");
  const coursesQuery = useCourses();
  const progressQuery = useUserProgress();
  const activeCourseId = progressQuery.data?.activeCourseId ?? undefined;
  const { onClick } = useCourseSelection({ activeCourseId });

  if (coursesQuery.isLoading || progressQuery.isLoading) {
    return <CoursesPageSkeleton />;
  }

  const courses = coursesQuery.data ?? [];

  return (
    <FeedWrapper>
      <div className="pb-12">
        {/* Interactive Back / Breadcrumb */}
        <div className="mb-5 inline-flex items-center gap-1.5 text-xs font-medium">
          <Link
            href={withLocale("/learn")}
            className="group inline-flex items-center gap-1 text-muted-foreground hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors py-1 px-2.5 -ml-2.5 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
          >
            <ChevronLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5" />
            <span>{nav("learn")}</span>
          </Link>
          <span className="text-border">/</span>
          <span className="text-emerald-600 dark:text-emerald-400 font-semibold">{t("byCert")}</span>
        </div>

        <header className="mb-7 max-w-2xl">
          <p className="eyebrow text-emerald-600 dark:text-emerald-400 font-semibold tracking-wider text-xs uppercase inline-flex items-center gap-2">
            <GraduationCap className="h-4 w-4" />
            <span>{t("exploreByCert")}</span>
          </p>
          <h1 className="mt-2.5 text-3xl font-semibold text-foreground tracking-tight sm:text-4xl">
            {t("certTitle")}
          </h1>
          <p className="mt-3 max-w-[65ch] text-sm leading-relaxed text-muted-foreground">
            {t("certDescription")}
          </p>
        </header>

        <DiscoveryTabs active="certs" certCount={4} onSelectMode={onSelectMode} />

        <section className="mt-4">
          <div className="mb-4 flex items-end justify-between gap-4">
            <div>
              <p className="eyebrow text-xs uppercase tracking-wider font-medium">{t("yourCerts")}</p>
              <h3 className="mt-1 text-xl font-semibold text-foreground">
                {t("certStatsSummary", { total: 4, active: 1, locked: 3 })}
              </h3>
            </div>
            <button className="text-xs font-bold text-primary flex items-center gap-1 hover:underline">
              <Plus className="h-3.5 w-3.5" /> {t("addCertBtn")}
            </button>
          </div>

          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {/* Cert 1: IELTS Academic (Active Primary) */}
            <div
              onClick={() => courses[0] && onClick(courses[0].id)}
              className="group rounded-2xl border-2 border-emerald-500 bg-card p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md cursor-pointer flex flex-col justify-between min-h-[175px]"
            >
              <div>
                <div className="flex items-start justify-between">
                  <div className="h-11 w-11 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center font-extrabold text-xs tracking-tight shadow-xs">
                    IELTS
                  </div>
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 px-2.5 py-0.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                    ● 42%
                  </span>
                </div>
                <h4 className="mt-3 text-lg font-semibold text-foreground group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">IELTS Academic</h4>
                <p className="mt-1 text-xs text-muted-foreground">{t("targetGoal", { learned: "428", total: "1,247" })}</p>
              </div>

              <div className="mt-4">
                <div className="h-1.5 overflow-hidden rounded-full bg-muted/80">
                  <div className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-400" style={{ width: "42%" }} />
                </div>
                <div className="mt-2.5 flex items-center justify-between text-xs">
                  <span className="text-muted-foreground font-medium">📅 {learnT("hoursAgo")}</span>
                  <span className="font-bold text-primary inline-flex items-center gap-1">
                    {t("continue")} <ArrowRight className="h-3.5 w-3.5 stroke-[2.5]" />
                  </span>
                </div>
              </div>
            </div>

            {/* Cert 2: TOEIC 600+ (Locked) */}
            <div className="rounded-2xl border border-border/80 bg-card p-5 opacity-65 shadow-sm flex flex-col justify-between min-h-[175px]">
              <div>
                <div className="flex items-start justify-between">
                  <div className="h-11 w-11 rounded-xl bg-muted text-muted-foreground border border-border/60 flex items-center justify-center font-extrabold text-xs tracking-tight">
                    TOEIC
                  </div>
                  <span className="inline-flex items-center gap-1 rounded-full bg-muted/80 px-2.5 py-0.5 text-xs font-bold text-muted-foreground border border-border/50">
                    <Lock className="h-3 w-3" />
                  </span>
                </div>
                <h4 className="mt-3 text-lg font-semibold text-foreground">TOEIC 600+</h4>
                <p className="mt-1 text-xs font-medium text-amber-600 dark:text-amber-400">{t("unlockConditionIelts")}</p>
              </div>

              <div className="mt-4">
                <div className="h-1.5 overflow-hidden rounded-full bg-muted/80">
                  <div className="h-full bg-border" style={{ width: "100%" }} />
                </div>
                <div className="mt-2.5 flex items-center justify-between text-xs font-semibold">
                  <span className="text-muted-foreground">0/980 {t("words").toLowerCase()}</span>
                  <span className="text-muted-foreground inline-flex items-center gap-1">
                    <Lock className="h-3 w-3" /> {t("lockedStatus")}
                  </span>
                </div>
              </div>
            </div>

            {/* Cert 3: TOEFL iBT (Locked) */}
            <div className="rounded-2xl border border-border/80 bg-card p-5 opacity-65 shadow-sm flex flex-col justify-between min-h-[175px]">
              <div>
                <div className="flex items-start justify-between">
                  <div className="h-11 w-11 rounded-xl bg-muted text-muted-foreground border border-border/60 flex items-center justify-center font-extrabold text-xs tracking-tight">
                    TOEFL
                  </div>
                  <span className="inline-flex items-center gap-1 rounded-full bg-muted/80 px-2.5 py-0.5 text-xs font-bold text-muted-foreground border border-border/50">
                    <Lock className="h-3 w-3" />
                  </span>
                </div>
                <h4 className="mt-3 text-lg font-semibold text-foreground">TOEFL iBT</h4>
                <p className="mt-1 text-xs font-medium text-amber-600 dark:text-amber-400">{t("unlockConditionIelts")}</p>
              </div>

              <div className="mt-4">
                <div className="h-1.5 overflow-hidden rounded-full bg-muted/80">
                  <div className="h-full bg-border" style={{ width: "100%" }} />
                </div>
                <div className="mt-2.5 flex items-center justify-between text-xs font-semibold">
                  <span className="text-muted-foreground">0/1,100 {t("words").toLowerCase()}</span>
                  <span className="text-muted-foreground inline-flex items-center gap-1">
                    <Lock className="h-3 w-3" /> {t("lockedStatus")}
                  </span>
                </div>
              </div>
            </div>

            {/* Cert 4: VSTEP B1 (Locked) */}
            <div className="rounded-2xl border border-border/80 bg-card p-5 opacity-65 shadow-sm flex flex-col justify-between min-h-[175px]">
              <div>
                <div className="flex items-start justify-between">
                  <div className="h-11 w-11 rounded-xl bg-muted text-muted-foreground border border-border/60 flex items-center justify-center font-extrabold text-xs tracking-tight">
                    VSTP
                  </div>
                  <span className="inline-flex items-center gap-1 rounded-full bg-muted/80 px-2.5 py-0.5 text-xs font-bold text-muted-foreground border border-border/50">
                    <Lock className="h-3 w-3" />
                  </span>
                </div>
                <h4 className="mt-3 text-lg font-semibold text-foreground">VSTEP B1</h4>
                <p className="mt-1 text-xs font-medium text-amber-600 dark:text-amber-400">{t("unlockConditionToeic")}</p>
              </div>

              <div className="mt-4">
                <div className="h-1.5 overflow-hidden rounded-full bg-muted/80">
                  <div className="h-full bg-border" style={{ width: "100%" }} />
                </div>
                <div className="mt-2.5 flex items-center justify-between text-xs font-semibold">
                  <span className="text-muted-foreground">0/820 {t("words").toLowerCase()}</span>
                  <span className="text-muted-foreground inline-flex items-center gap-1">
                    <Lock className="h-3 w-3" /> {t("lockedStatus")}
                  </span>
                </div>
              </div>
            </div>

            {/* Add cert card */}
            <div className="rounded-2xl border-2 border-dashed border-border/80 bg-card p-5 flex flex-col items-center justify-center text-center transition-all hover:bg-muted/40 cursor-pointer min-h-[175px]">
              <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-muted-foreground mb-2">
                <Plus className="h-5 w-5" />
              </div>
              <div className="font-bold text-sm text-foreground">{t("addOtherCert")}</div>
              <div className="text-xs text-muted-foreground mt-1">{t("certTypesSupported")}</div>
            </div>
          </div>
        </section>
      </div>
    </FeedWrapper>
  );
}
