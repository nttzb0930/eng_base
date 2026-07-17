"use client";

import { useEffect } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/app/components/ui/button";
import { useAuth } from "@/app/features/auth/hooks/use-auth";

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
    // Return empty loading/redirecting state to avoid layout shift or flash of error UI
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <div className="flex flex-col items-center gap-2">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-green-500 border-t-transparent" />
          <p className="text-sm font-medium text-neutral-500">Redirecting...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-neutral-50 px-4 text-center">
      <div className="max-w-md rounded-2xl bg-white p-8 shadow-xl border border-neutral-100">
        <div className="text-red-500 text-5xl mb-4 font-bold">⚠️</div>
        <h2 className="text-2xl font-bold text-neutral-800 mb-2">
          {locale === "vi" ? "Đã xảy ra lỗi!" : "Something went wrong!"}
        </h2>
        <p className="text-sm text-neutral-500 mb-6">
          {error.message || (locale === "vi" ? "Đã xảy ra lỗi không xác định." : "An unexpected error occurred.")}
        </p>
        <div className="flex gap-4 justify-center">
          <Button
            onClick={() => reset()}
            variant="secondary"
            className="font-semibold rounded-xl px-6 py-2 transition-all shadow-md active:scale-95"
          >
            {locale === "vi" ? "Thử lại" : "Try again"}
          </Button>
          <Button
            onClick={() => {
              const prefix = locale === "vi" ? "/vi" : "/en";
              window.location.href = `${prefix}/dashboard`;
            }}
            variant="default"
            className="font-semibold rounded-xl px-6 py-2 transition-all"
          >
            {locale === "vi" ? "Trang chủ" : "Home"}
          </Button>
        </div>
      </div>
    </div>
  );
}
