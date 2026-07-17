import type { PropsWithChildren } from "react";
import { redirect } from "next/navigation";
import { getLocale } from "next-intl/server";

import { withLocale } from "@/app/i18n/paths";
import { defaultLocale, isLocale } from "@/app/i18n/config";
import { getUserProgress } from "@/src/modules/learning/queries";

const LessonLayout = async ({ children }: PropsWithChildren) => {
  const currentLocale = await getLocale();
  const locale = isLocale(currentLocale) ? currentLocale : defaultLocale;

  let userProgress = null;
  try {
    userProgress = await getUserProgress();
  } catch (err) {
    // If fetching fails or unauthorized, let standard handlers execute
  }

  if (userProgress && !userProgress.isPlacementTestConfirmed) {
    redirect(withLocale("/placement-test", locale));
  }

  return (
    <div className="flex h-dvh min-h-0 w-full flex-col overflow-hidden">
      {children}
    </div>
  );
};

export default LessonLayout;
