"use client";

import { ArrowRight, ChevronLeft, GraduationCap } from "lucide-react";
import { useTranslations } from "next-intl";

import { CoursesPageSkeleton } from "@/app/components/feedback/RouteSkeletons";
import { FeedWrapper } from "@/app/components/layout/FeedWrapper";
import { LocalizedLink as Link } from "@/app/components/navigation/LocalizedLink";
import { isCertificateCourse } from "@/app/features/courses/certificate-course";
import { useCourseSelection } from "@/app/features/courses/hooks/use-course-selection";
import { useCourses } from "@/app/features/courses/hooks/use-courses";
import { useUserProgress } from "@/app/features/progress/hooks/use-user-progress";
import { withLocale } from "@/app/i18n/paths";

export function CoursesView() {
  const t = useTranslations("topics");
  const nav = useTranslations("navigation");
  const coursesQuery = useCourses();
  const progressQuery = useUserProgress();
  const activeCourseId = progressQuery.data?.activeCourseId ?? undefined;
  const { onClick, pending } = useCourseSelection({ activeCourseId });

  if (coursesQuery.isLoading || progressQuery.isLoading) {
    return <CoursesPageSkeleton />;
  }

  const certificateCourses = (coursesQuery.data ?? []).filter(
    isCertificateCourse
  );

  return (
    <FeedWrapper>
      <div className="pb-12">
        <div className="mb-5 inline-flex items-center gap-1.5 text-xs font-medium">
          <Link
            href={withLocale("/learn")}
            className="text-muted-foreground group -ml-2.5 inline-flex items-center gap-1 rounded-lg px-2.5 py-1 transition-colors hover:bg-emerald-50 hover:text-emerald-600 dark:hover:bg-emerald-950/40 dark:hover:text-emerald-400"
          >
            <ChevronLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5" />
            <span>{nav("learn")}</span>
          </Link>
          <span className="text-border">/</span>
          <span className="font-semibold text-emerald-600 dark:text-emerald-400">
            {t("byCert")}
          </span>
        </div>

        <header className="mb-7 max-w-2xl">
          <p className="eyebrow inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
            <GraduationCap className="h-4 w-4" />
            <span>{t("exploreByCert")}</span>
          </p>
          <h1 className="text-foreground mt-2.5 text-3xl font-semibold tracking-tight sm:text-4xl">
            {t("certTitle")}
          </h1>
          <p className="text-muted-foreground mt-3 max-w-[65ch] text-sm leading-relaxed">
            {t("certDescription")}
          </p>
        </header>

        <section aria-labelledby="certificate-courses-title" className="mt-4">
          <div className="mb-4">
            <p className="eyebrow text-xs font-medium uppercase tracking-wider">
              {t("yourCerts")}
            </p>
            <h2
              id="certificate-courses-title"
              className="text-foreground mt-1 text-xl font-semibold"
            >
              {t("certificateCoursesCount", {
                count: certificateCourses.length,
              })}
            </h2>
          </div>

          {certificateCourses.length === 0 ? (
            <div
              role="status"
              className="border-border/80 bg-card shadow-xs rounded-2xl border border-dashed px-6 py-12 text-center"
            >
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-emerald-200 bg-emerald-50 text-emerald-600 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-400">
                <GraduationCap className="h-6 w-6" />
              </div>
              <h3 className="text-foreground mt-4 text-lg font-semibold">
                {t("certificateUnavailableTitle")}
              </h3>
              <p className="text-muted-foreground mx-auto mt-2 max-w-xl text-sm leading-relaxed">
                {t("certificateUnavailableDescription")}
              </p>
              <Link
                href={withLocale("/learn/level")}
                className="mt-6 inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 text-xs font-semibold text-white transition-colors hover:bg-emerald-700"
              >
                {t("certificateUnavailableAction")}
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          ) : (
            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {certificateCourses.map((course) => {
                const active = course.id === activeCourseId;

                return (
                  <article
                    key={course.code}
                    className="border-border/80 bg-card shadow-xs flex min-h-[175px] flex-col justify-between rounded-2xl border p-5 transition-all duration-200 hover:-translate-y-0.5 hover:border-emerald-500/40 hover:shadow-md"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-600 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-400">
                          <GraduationCap className="h-5 w-5" />
                        </div>
                        <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300">
                          {active
                            ? t("certificateActive")
                            : t("certificateCourseReady")}
                        </span>
                      </div>
                      <h3 className="text-foreground mt-4 text-lg font-semibold">
                        {course.title}
                      </h3>
                      <p className="text-muted-foreground mt-1 font-mono text-xs">
                        {course.code}
                      </p>
                    </div>

                    {course.code === "toeic-600" ? (
                      <Link
                        href={withLocale("/learn/cert/toeic")}
                        className="mt-5 inline-flex min-h-10 w-full items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-4 text-xs font-semibold text-white transition-colors hover:bg-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 active:translate-y-px"
                      >
                        {t("continue")}
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    ) : (
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() => onClick(course.id)}
                        className="mt-5 inline-flex min-h-10 w-full items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-4 text-xs font-semibold text-white transition-colors hover:bg-emerald-700 disabled:cursor-wait disabled:opacity-60"
                      >
                        {active ? t("continue") : t("startCertificate")}
                        <ArrowRight className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </FeedWrapper>
  );
}
