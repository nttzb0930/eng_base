"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { useCurrentLocale } from "@/app/i18n/use-current-locale";
import { withLocale } from "@/app/i18n/paths";

type PlacementConfirmationGuardProps = {
  isConfirmed: boolean;
  fallback: React.ReactNode;
  children: React.ReactNode;
};

export function PlacementConfirmationGuard({
  isConfirmed,
  fallback,
  children,
}: PlacementConfirmationGuardProps) {
  const router = useRouter();
  const locale = useCurrentLocale();

  useEffect(() => {
    if (!isConfirmed) {
      router.replace(withLocale("/placement-test", locale));
    }
  }, [isConfirmed, locale, router]);

  if (!isConfirmed) return <>{fallback}</>;
  return <>{children}</>;
}
