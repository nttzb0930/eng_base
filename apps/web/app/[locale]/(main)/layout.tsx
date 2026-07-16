import type { PropsWithChildren } from "react";
import { redirect } from "next/navigation";
import { getLocale } from "next-intl/server";

import { withLocale } from "@/src/lib/i18n/paths";
import { defaultLocale, isLocale } from "@/src/lib/i18n/config";
import { getUserProgress } from "@/src/modules/learning/queries";
import { MobileHeader } from "@/src/components/mobile-header";
import { Header } from "@/src/components/header";
import { ScrollToTopButton } from "@/src/components/scroll-to-top-button";

const MainLayout = async ({ children }: PropsWithChildren) => {
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
    <>
      <MobileHeader />
      <Header className="hidden lg:flex" />
      <main id="main-content" className="min-h-dvh pt-16 lg:pt-[68px]">
        <div className="app-container py-6 sm:py-8 lg:py-10">{children}</div>
      </main>
      <ScrollToTopButton />
    </>
  );
};

export default MainLayout;
