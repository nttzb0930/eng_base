import { notFound, redirect } from "next/navigation";

import { withLocale } from "@/src/lib/i18n/paths";
import { isLocale } from "@/src/lib/i18n/config";

type LocalePageProps = {
  params: Promise<{
    locale: string;
  }>;
};

export default async function LocalePage({ params }: LocalePageProps) {
  const { locale } = await params;

  if (!isLocale(locale)) notFound();

  redirect(withLocale("/learn", locale));
}
