"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { LocalizedLink as Link } from "@/app/components/navigation/LocalizedLink";
import { Button } from "@/app/components/ui/button";
import { useAuth } from "@/app/features/auth/hooks/use-auth";
import { resolvePostAuthRedirect } from "@/app/features/auth/routing/resolve-post-auth-redirect";
import { progressApi } from "@/app/features/progress/api/progress.api";
import { useCurrentLocale } from "@/app/i18n/use-current-locale";
import { withLocale } from "@/app/i18n/paths";
import { toast } from "sonner";
import { Eye, EyeOff, Loader2, Mail, Lock } from "lucide-react";
import Image from "next/image";
import { AuthBrandPanel } from "./components/AuthBrandPanel";

const appName = process.env.NEXT_PUBLIC_APP_NAME?.trim() || "English Base";

export function SignInView() {
  const router = useRouter();
  const t = useTranslations("auth");
  const locale = useCurrentLocale();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      toast.error(t("requiredFieldsError"));
      return;
    }

    setLoading(true);
    try {
      await login({ username, password });
      const progress = await progressApi.getUserProgress();

      toast.success(t("signInSuccess"));
      router.push(withLocale(resolvePostAuthRedirect(progress), locale));
    } catch (error) {
      if (error instanceof Error && error.message === "EMAIL_NOT_VERIFIED") {
        const query = username.includes("@")
          ? `?email=${encodeURIComponent(username)}`
          : "";
        router.push(`${withLocale("/verify-email", locale)}${query}`);
        return;
      }
      toast.error(
        error instanceof Error ? error.message : t("signInFailedError")
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen w-full flex-col bg-white lg:flex-row lg:items-start">
      <AuthBrandPanel />

      {/* Right side: Login Form */}
      <div className="flex min-h-screen w-full flex-col justify-center overflow-y-auto bg-slate-50 px-6 py-12 sm:px-12 lg:w-1/2 lg:bg-white lg:px-20">
        <div className="mx-auto w-full max-w-md">
          {/* Logo visible only on Mobile */}
          <div className="mb-8 flex justify-center lg:hidden">
            <Link href="/" className="flex items-center gap-x-3">
              <Image
                src="/mascot.svg"
                alt={t("mascotAlt")}
                height={40}
                width={40}
              />
              <h1 className="text-2xl font-extrabold tracking-wide text-green-600">
                {appName}
              </h1>
            </Link>
          </div>

          <div className="animate-page-enter rounded-md border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            <div className="text-center">
              <h2 className="text-3xl font-extrabold tracking-tight text-neutral-800">
                {t("signInTitle")}
              </h2>
              <p className="mt-3 text-sm text-neutral-600">
                {t("signInDescription")}
              </p>
            </div>

            <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
              <div>
                <label
                  htmlFor="username"
                  className="mb-1.5 block text-sm font-semibold text-neutral-700"
                >
                  {t("usernameOrEmailLabel")}
                </label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
                    <Mail className="h-4.5 w-4.5 text-neutral-400" />
                  </div>
                  <input
                    id="username"
                    name="username"
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="block w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 pl-11 text-neutral-800 placeholder-neutral-400 shadow-sm transition-all focus:border-transparent focus:outline-none focus:ring-2 focus:ring-green-500 sm:text-sm"
                    placeholder={t("usernameOrEmailPlaceholder")}
                  />
                </div>
              </div>

              <div>
                <div className="mb-1.5 flex items-center justify-between gap-3">
                  <label
                    htmlFor="password"
                    className="block text-sm font-semibold text-neutral-700"
                  >
                    {t("passwordLabel")}
                  </label>
                </div>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
                    <Lock className="h-4.5 w-4.5 text-neutral-400" />
                  </div>
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="block w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 pl-11 text-neutral-800 placeholder-neutral-400 shadow-sm transition-all focus:border-transparent focus:outline-none focus:ring-2 focus:ring-green-500 sm:text-sm"
                    placeholder={t("passwordPlaceholder")}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((current) => !current)}
                    className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-neutral-400 transition hover:text-neutral-700"
                    aria-label={
                      showPassword ? t("hidePassword") : t("showPassword")
                    }
                  >
                    {showPassword ? (
                      <EyeOff className="h-4.5 w-4.5" />
                    ) : (
                      <Eye className="h-4.5 w-4.5" />
                    )}
                  </button>
                </div>
                <div className="mt-2 text-right">
                  <Link
                    href="/forgot-password"
                    className="text-sm font-semibold text-green-600 transition-colors hover:text-green-500"
                  >
                    {t("forgotPassword")}
                  </Link>
                </div>
              </div>

              <div>
                <Button
                  type="submit"
                  disabled={loading}
                  className="active:scale-98 flex w-full justify-center rounded-xl border border-transparent bg-green-600 px-4 py-3 text-sm font-bold text-white shadow-md transition-all hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {t("processing")}
                    </>
                  ) : (
                    t("signInButton")
                  )}
                </Button>
              </div>

              <p className="text-center text-sm text-neutral-600">
                {t("noAccount")}{" "}
                <Link
                  href="/sign-up"
                  className="font-semibold text-green-600 transition-colors hover:text-green-500"
                >
                  {t("signUpFree")}
                </Link>
              </p>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
