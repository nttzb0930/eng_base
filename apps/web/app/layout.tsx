import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";

import { Toaster } from "@/app/components/ui/sonner";
import { Providers } from "@/app/providers";

import "./globals.css";

const inter = Inter({
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-inter",
});

export const viewport: Viewport = {
  themeColor: "#22C55E",
};

const appName = process.env.NEXT_PUBLIC_APP_NAME?.trim() || "English Base";

export const metadata: Metadata = {
  title: appName,
  description:
    "English vocabulary learning app for Vietnamese learners with CEFR lessons, quizzes, flashcards, review scheduling, and progress tracking.",
  keywords: [
    "nextjs",
    "react",
    "english-learning",
    "vocabulary",
    "cefr",
    "vietnamese-learners",
    "flashcards",
    "spaced-repetition",
    "listening-practice",
    "dictation-practice",
    "postgresql",
    "prisma",
    "radix-ui",
    "jwt",
    "tailwindcss",
    "typescript",
  ],
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html lang={locale} className={`${inter.variable} ${inter.className}`}>
      <body>
        <NextIntlClientProvider locale={locale} messages={messages}>
          <Providers>
            <Toaster
              position="top-right"
              theme="light"
              richColors
              closeButton
            />
            {children}
          </Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
