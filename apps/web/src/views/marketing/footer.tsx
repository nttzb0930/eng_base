"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";

import { Button } from "@/src/components/ui/button";

export const Footer = () => {
  const t = useTranslations("marketing.languages");

  return (
    <div className="hidden h-20 w-full border-t-2 border-slate-200 p-2 lg:block">
      <div className="mx-auto flex h-full max-w-screen-lg items-center justify-evenly">
        <Button size="lg" variant="ghost" className="w-full cursor-default">
          <Image
            src="/hr.svg"
            alt={t("croatian")}
            height={32}
            width={40}
            className="mr-4 rounded-md"
          />
          {t("croatian")}
        </Button>

        <Button size="lg" variant="ghost" className="w-full cursor-default">
          <Image
            src="/es.svg"
            alt={t("spanish")}
            height={32}
            width={40}
            className="mr-4 rounded-md"
          />
          {t("spanish")}
        </Button>

        <Button size="lg" variant="ghost" className="w-full cursor-default">
          <Image
            src="/fr.svg"
            alt={t("french")}
            height={32}
            width={40}
            className="mr-4 rounded-md"
          />
          {t("french")}
        </Button>

        <Button size="lg" variant="ghost" className="w-full cursor-default">
          <Image
            src="/it.svg"
            alt={t("italian")}
            height={32}
            width={40}
            className="mr-4 rounded-md"
          />
          {t("italian")}
        </Button>

        <Button size="lg" variant="ghost" className="w-full cursor-default">
          <Image
            src="/jp.svg"
            alt={t("japanese")}
            height={32}
            width={40}
            className="mr-4 rounded-md"
          />
          {t("japanese")}
        </Button>
      </div>
    </div>
  );
};
