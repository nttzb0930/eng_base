import { notFound } from "next/navigation";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, setRequestLocale } from "next-intl/server";

import { ExitModal } from "@/app/features/lessons/components/ExitModal";
import { HeartsModal } from "@/app/features/progress/components/HeartsModal";
import { PracticeModal } from "@/app/features/practice/components/PracticeModal";
import { isLocale } from "@/app/i18n/config";

type LocaleLayoutProps = {
  children: React.ReactNode;
  params: Promise<{
    locale: string;
  }>;
};

export default async function LocaleLayout({
  children,
  params,
}: LocaleLayoutProps) {
  const { locale } = await params;

  if (!isLocale(locale)) {
    notFound();
  }

  setRequestLocale(locale);

  const messages = await getMessages({ locale });

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      <ExitModal />
      <HeartsModal />
      <PracticeModal />
      {children}
    </NextIntlClientProvider>
  );
}
