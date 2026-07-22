"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { AlertTriangle, ChevronDown, ChevronUp, Home, RefreshCw, Terminal } from "lucide-react";
import { LocalizedLink as Link } from "@/app/components/navigation/LocalizedLink";
import { useAuth } from "@/app/features/auth/hooks/use-auth";
import { withLocale } from "@/app/i18n/paths";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { logout } = useAuth();
  const params = useParams();
  const locale = (params?.locale as string) || "vi";
  const [showDetails, setShowDetails] = useState(false);

  const isUnauthorized =
    error.message?.includes("Unauthorized") ||
    error.message?.includes("TOKEN_INVALID") ||
    error.message?.includes("401");

  useEffect(() => {
    if (isUnauthorized) {
      const prefix = locale === "vi" ? "/vi" : "/en";
      void logout().finally(() => window.location.replace(`${prefix}/sign-in`));
    } else {
      console.error("Unhandled error boundary catch:", error);
    }
  }, [isUnauthorized, error, locale, logout]);

  if (isUnauthorized) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="h-9 w-9 animate-spin rounded-full border-3 border-primary border-t-transparent" />
          <p className="text-sm font-medium text-muted-foreground">
            {locale === "vi" ? "Đang chuyển hướng đăng nhập..." : "Redirecting to sign-in..."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden bg-background p-4 sm:p-6 lg:p-8">
      {/* Subtle Background Glow Elements */}
      <div className="pointer-events-none absolute -top-40 left-1/2 h-[500px] w-[500px] -translate-x-1/2 rounded-full bg-rose-500/8 blur-[120px] dark:bg-rose-500/12" />
      <div className="pointer-events-none absolute -bottom-32 right-1/4 h-80 w-80 rounded-full bg-amber-500/6 blur-[100px]" />

      {/* Main Error V3 Card */}
      <div className="relative z-10 w-full max-w-lg rounded-3xl border border-border/80 bg-card p-6 sm:p-8 shadow-xl backdrop-blur-md">
        {/* Error Icon Badge */}
        <div className="flex items-center justify-center">
          <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-50 dark:bg-rose-950/50 text-rose-500 border border-rose-200 dark:border-rose-800/60 shadow-xs">
            <AlertTriangle className="h-8 w-8 stroke-[2.2]" />
            <span className="absolute -bottom-1 -right-1 flex h-4 w-4">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
              <span className="relative inline-flex h-4 w-4 rounded-full bg-rose-500" />
            </span>
          </div>
        </div>

        {/* Header Content */}
        <div className="mt-5 text-center">
          <h2 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            {locale === "vi" ? "Đã xảy ra lỗi hệ thống" : "Something went wrong"}
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            {locale === "vi"
              ? "Trang bạn yêu cầu tạm thời không thể xử lý. Hãy thử tải lại hoặc quay về trang chủ."
              : "We couldn't process your request. Please try refreshing or return to the dashboard."}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="mt-7 flex flex-col sm:flex-row items-center gap-3">
          <button
            onClick={() => reset()}
            className="w-full sm:flex-1 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold shadow-xs transition hover:bg-primary/90 active:scale-[0.98]"
          >
            <RefreshCw className="h-4 w-4" />
            {locale === "vi" ? "Thử lại ngay" : "Try again"}
          </button>

          <Link
            href={withLocale("/dashboard")}
            className="w-full sm:flex-1 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-border/80 bg-card text-foreground text-sm font-semibold shadow-xs transition hover:bg-muted active:scale-[0.98]"
          >
            <Home className="h-4 w-4 text-muted-foreground" />
            {locale === "vi" ? "Về trang chủ" : "Dashboard"}
          </Link>
        </div>

        {/* Collapsible Error Debug Details */}
        <div className="mt-6 border-t border-border/60 pt-4">
          <button
            onClick={() => setShowDetails((prev) => !prev)}
            className="w-full flex items-center justify-between text-xs font-medium text-muted-foreground hover:text-foreground transition-colors py-1"
          >
            <span className="inline-flex items-center gap-1.5">
              <Terminal className="h-3.5 w-3.5" />
              {locale === "vi" ? "Chi tiết kỹ thuật (Developer)" : "Technical Details"}
            </span>
            {showDetails ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </button>

          {showDetails && (
            <div className="mt-3 animate-page-enter rounded-xl bg-muted/60 p-3.5 font-mono text-[11px] leading-relaxed text-muted-foreground border border-border/40 overflow-x-auto max-h-40">
              <p className="font-semibold text-rose-500 mb-1">
                {error.name || "Error"}: {error.message || "Unknown error"}
              </p>
              {error.digest && <p className="text-[10px] opacity-75">Digest ID: {error.digest}</p>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
