"use client";

import { Loader } from "lucide-react";
import Image from "next/image";
import { LocalizedLink as Link } from "@/app/components/navigation/LocalizedLink";
import { useTranslations } from "next-intl";

import { Button } from "@/app/components/ui/button";
import { withLocale } from "@/app/i18n/paths";
import { useAuth } from "@/app/features/auth/hooks/use-auth";

export function MarketingView() {
  const t = useTranslations("marketing");
  const { status } = useAuth();
  const loading = status === "loading";
  const isSignedIn = status === "authenticated";

  return (
    <div className="mx-auto flex w-full max-w-[988px] flex-1 flex-col items-center justify-center gap-2 p-4 lg:flex-row">
      <div className="relative mb-8 h-[240px] w-[240px] lg:mb-0 lg:h-[424px] lg:w-[424px]">
        <Image src="/hero.svg" alt="Hero" fill />
      </div>

      <div className="flex flex-col items-center gap-y-8">
        <h1 className="max-w-[480px] text-center text-xl font-bold text-neutral-600 lg:text-3xl">
          {t("headline")}
        </h1>

        <div className="flex w-full max-w-[330px] flex-col items-center gap-y-3">
          {loading ? (
            <Loader className="h-5 w-5 animate-spin text-muted-foreground" />
          ) : isSignedIn ? (
            <Button size="lg" variant="secondary" className="w-full" asChild>
              <Link href={withLocale("/learn")}>
                {t("continueLearning")}
              </Link>
            </Button>
          ) : (
            <>
              <Button size="lg" variant="secondary" className="w-full" asChild>
                <Link href="/sign-up">
                  {t("getStarted")}
                </Link>
              </Button>

              <Button size="lg" variant="primaryOutline" className="w-full" asChild>
                <Link href="/sign-in">
                  {t("alreadyHaveAccount")}
                </Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
