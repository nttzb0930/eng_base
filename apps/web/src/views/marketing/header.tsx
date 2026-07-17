"use client";

import { Loader } from "lucide-react";
import Image from "next/image";
import { LocalizedLink as Link } from "@/app/components/navigation/LocalizedLink";
import { useTranslations } from "next-intl";

import { Button } from "@/app/components/ui/button";
import { withLocale } from "@/app/i18n/paths";
import { useAuth } from "@/app/features/auth/hooks/use-auth";

export const Header = () => {
  const t = useTranslations("marketing");
  const { status } = useAuth();
  const loading = status === "loading";
  const isSignedIn = status === "authenticated";

  return (
    <header className="h-20 w-full border-b-2 border-slate-200 px-4">
      <div className="mx-auto flex h-full items-center justify-between lg:max-w-screen-lg">
        <Link href="/" className="flex items-center gap-x-3 pb-7 pl-4 pt-8">
          <Image
            src="/mascot.svg"
            alt={t("mascotAlt")}
            height={40}
            width={40}
          />

          <h1 className="text-2xl font-extrabold tracking-wide text-green-600">
            VoCaBu
          </h1>
        </Link>

        <div className="flex gap-x-3">
          {loading ? (
            <Loader className="h-5 w-5 animate-spin text-muted-foreground" />
          ) : isSignedIn ? (
            <Button size="lg" variant="secondary" asChild>
              <Link href={withLocale("/learn")}>
                {t("continueLearning")}
              </Link>
            </Button>
          ) : (
            <Button size="lg" variant="ghost" asChild>
              <Link href="/sign-in">
                {t("login")}
              </Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
};
