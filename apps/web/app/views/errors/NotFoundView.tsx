"use client";

import { useParams } from "next/navigation";
import { ArrowLeft, FileQuestion, Home } from "lucide-react";
import { LocalizedLink as Link } from "@/app/components/navigation/LocalizedLink";
import { withLocale } from "@/app/i18n/paths";

export function NotFoundView() {
  const params = useParams();
  const locale = (params?.locale as string) || "vi";

  return (
    <div className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden bg-background p-4 sm:p-6 lg:p-8">
      {/* Background Glow */}
      <div className="pointer-events-none absolute -top-40 left-1/2 h-[500px] w-[500px] -translate-x-1/2 rounded-full bg-blue-500/8 blur-[120px] dark:bg-blue-500/12" />
      <div className="pointer-events-none absolute -bottom-32 right-1/4 h-80 w-80 rounded-full bg-indigo-500/6 blur-[100px]" />

      {/* Main 404 V3 Card */}
      <div className="relative z-10 w-full max-w-lg rounded-3xl border border-border/80 bg-card p-6 sm:p-8 shadow-xl backdrop-blur-md text-center">
        {/* Badge Icon */}
        <div className="flex items-center justify-center">
          <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800/60 shadow-xs">
            <FileQuestion className="h-8 w-8 stroke-[2.2]" />
          </div>
        </div>

        {/* 404 Big Number & Text */}
        <div className="mt-4">
          <span className="text-5xl font-extrabold tracking-tight text-primary sm:text-6xl">404</span>
          <h2 className="mt-2 text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
            {locale === "vi" ? "Không tìm thấy trang" : "Page Not Found"}
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground max-w-md mx-auto">
            {locale === "vi"
              ? "Đường dẫn (slug) bạn nhập không tồn tại hoặc đã bị di chuyển sang vị trí khác."
              : "The page or URL slug you entered doesn't exist or has been moved."}
          </p>
        </div>

        {/* Action CTAs */}
        <div className="mt-7 flex flex-col sm:flex-row items-center gap-3 justify-center">
          <button
            onClick={() => window.history.back()}
            className="w-full sm:w-auto inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-border/80 bg-card px-5 text-foreground text-sm font-semibold shadow-xs transition hover:bg-muted active:scale-[0.98]"
          >
            <ArrowLeft className="h-4 w-4 text-muted-foreground" />
            {locale === "vi" ? "Quay lại" : "Go back"}
          </button>

          <Link
            href={withLocale("/dashboard")}
            className="w-full sm:w-auto inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-6 text-primary-foreground text-sm font-semibold shadow-xs transition hover:bg-primary/90 active:scale-[0.98]"
          >
            <Home className="h-4 w-4" />
            {locale === "vi" ? "Về trang chủ" : "Dashboard"}
          </Link>
        </div>
      </div>
    </div>
  );
}
export default NotFoundView;
