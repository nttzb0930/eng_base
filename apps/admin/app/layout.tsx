import type { Metadata } from "next";

import { Toaster } from "sonner";
import { Providers } from "@/app/providers";

import "./globals.css";

const appName = process.env.NEXT_PUBLIC_APP_NAME?.trim() || "English Base";

export const metadata: Metadata = {
  title: `${appName} Admin`,
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
