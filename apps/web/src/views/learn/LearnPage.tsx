import { redirect } from "next/navigation";
import { getLocale } from "next-intl/server";

import { withLocale } from "@/app/i18n/paths";
import { defaultLocale, isLocale } from "@/app/i18n/config";
import {
  getCourseProgress,
  getLessonPercentage,
  getUnits,
  getUserProgress,
} from "@/src/modules/learning/queries";
import { LearnView } from "@/src/views";
import { AuthRedirector } from "@/src/components/auth-redirector";

type LearnPageProps = {
  searchParams: Promise<{
    unit?: string;
  }>;
};

const LearnPage = async ({ searchParams }: LearnPageProps) => {
  const currentLocale = await getLocale();
  const locale = isLocale(currentLocale) ? currentLocale : defaultLocale;
  const { unit } = await searchParams;

  let userProgress, units, courseProgress, lessonPercentage;

  try {
    [userProgress, units, courseProgress, lessonPercentage] = await Promise.all([
      getUserProgress(),
      getUnits(),
      getCourseProgress(),
      getLessonPercentage(),
    ]);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    // If unauthorized, redirect to sign-in
    if (message.includes("Unauthorized") || message.includes("TOKEN_INVALID")) {
      return <AuthRedirector locale={locale} />;
    }
    // Otherwise redirect to placement-test for other errors
    redirect(withLocale("/placement-test", locale));
  }

  if (!courseProgress || !userProgress || !userProgress.activeCourse) {
    redirect(withLocale("/placement-test", locale));
  }

  return (
    <LearnView
      units={units}
      courseProgress={courseProgress}
      userProgress={userProgress}
      lessonPercentage={lessonPercentage}
      unitParam={unit}
    />
  );
};

export default LearnPage;
