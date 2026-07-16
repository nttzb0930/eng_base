import type { Metadata } from "next";

import { Toaster } from "sonner";
import { Providers } from "@/src/components/providers";

import "./globals.css";

export const metadata: Metadata = {
  title: "Lingo Admin",
  description: "English learning content administration",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="vi">
      <body>
        <Providers>
          {children}
          <Toaster position="top-right" richColors />
        </Providers>
      </body>
    </html>
  );
}
