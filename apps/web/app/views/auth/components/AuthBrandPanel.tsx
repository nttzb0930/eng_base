"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";

import { LocalizedLink as Link } from "@/app/components/navigation/LocalizedLink";

const appName = process.env.NEXT_PUBLIC_APP_NAME?.trim() || "English Base";

export function AuthBrandPanel() {
  const t = useTranslations("auth");

  return (
    <div className="relative hidden h-screen shrink-0 flex-col justify-between overflow-hidden bg-gradient-to-br from-green-600 via-emerald-600 to-teal-700 p-12 text-white lg:flex lg:w-1/2">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-white/10 via-transparent to-transparent" />
      <Link href="/" className="z-10 flex items-center gap-x-3">
        <Image src="/mascot.svg" alt={t("mascotAlt")} height={44} width={44} />
        <span className="text-3xl font-extrabold tracking-wide drop-shadow-sm">
          {appName}
        </span>
      </Link>
      <div className="z-10 flex flex-grow flex-col items-center justify-center py-12">
        <div className="relative h-[320px] w-[320px]">
          <Image
            src="/hero.svg"
            alt={t("heroAlt")}
            fill
            className="object-contain"
            priority
          />
        </div>
        <h2 className="mt-8 max-w-md text-center text-3xl font-bold leading-tight">
          {t("signInSlogan")}
        </h2>
        <p className="mt-3 max-w-sm text-center text-sm font-medium text-green-100">
          {t("signInSloganDesc")}
        </p>
      </div>
      <div className="z-10 text-xs text-green-200">
        © {new Date().getFullYear()} {appName}.
      </div>
    </div>
  );
}
