"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { LocalizedLink as Link } from "@/app/components/navigation/LocalizedLink";
import { Button } from "@/app/components/ui/button";
import { useAuth } from "@/app/features/auth/hooks/use-auth";
import { useCurrentLocale } from "@/app/i18n/use-current-locale";
import { withLocale } from "@/app/i18n/paths";
import { toast } from "sonner";
import { Eye, EyeOff, Loader2, Mail, Lock, User } from "lucide-react";
import Image from "next/image";

const appName = process.env.NEXT_PUBLIC_APP_NAME?.trim() || "English Base";

export function SignUpView() {
  const router = useRouter();
  const t = useTranslations("auth");
  const locale = useCurrentLocale();
  const { register } = useAuth();
  const [username, setUsername] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !fullName || !email || !password || !confirmPassword) {
      toast.error(t("requiredFieldsError"));
      return;
    }
    if (password !== confirmPassword) {
      toast.error(t("passwordMismatch"));
      return;
    }

    setLoading(true);
    try {
      const result = await register({ username, email, password, fullName });

      router.push(
        `${withLocale("/verify-email", locale)}?email=${encodeURIComponent(
          result.email
        )}`
      );
    } catch (error) {
      if (error instanceof Error && error.message === "USER_ALREADY_EXISTS") {
        toast.error(t("userExistsError"));
      } else {
        toast.error(
          error instanceof Error ? error.message : t("signUpFailedError")
        );
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen w-full flex-col bg-white lg:flex-row lg:items-start">
      {/* Left side: Branding & Hero - Hidden on Mobile */}
      <div className="relative hidden h-screen shrink-0 flex-col justify-between overflow-hidden bg-gradient-to-br from-green-600 via-emerald-600 to-teal-700 p-12 text-white lg:flex lg:w-1/2">
        {/* Subtle grid pattern overlay */}
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-white/10 via-transparent to-transparent" />

        {/* Top Logo */}
        <Link href="/" className="z-10 flex items-center gap-x-3">
          <Image
            src="/mascot.svg"
            alt={t("mascotAlt")}
            height={44}
            width={44}
            className="drop-shadow-md"
          />
          <h1 className="text-3xl font-extrabold tracking-wide text-white drop-shadow-sm">
            {appName}
          </h1>
        </Link>

        {/* Mascot Center Illustration */}
        <div className="z-10 flex flex-grow flex-col items-center justify-center py-12">
          <div className="relative h-[320px] w-[320px] transition-transform duration-500 ease-out hover:scale-105">
            <Image
              src="/hero.svg"
              alt={t("heroAlt")}
              fill
              className="object-contain"
              priority
            />
          </div>
          <h2 className="mt-8 max-w-md text-center text-3xl font-bold leading-tight">
            {t("signUpSlogan")}
          </h2>
          <p className="mt-3 max-w-sm text-center text-sm font-medium text-green-100">
            {t("signUpSloganDesc")}
          </p>
        </div>

        {/* Footer info */}
        <div className="z-10 text-xs text-green-200">
          © {new Date().getFullYear()} {appName}.
        </div>
      </div>

      {/* Right side: Register Form */}
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

          <section className="rounded-md border border-slate-200 bg-white p-6 text-center shadow-sm sm:p-8">
            <h2 className="text-3xl font-extrabold tracking-tight text-neutral-800">
              {t("signUpTitle")}
            </h2>
            <p className="mt-3 text-sm text-neutral-600">
              {t("hasAccount")}{" "}
              <Link
                href="/sign-in"
                className="font-semibold text-green-600 transition-colors hover:text-green-500"
              >
                {t("signInHere")}
              </Link>
            </p>
            <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
              <div>
                <label
                  htmlFor="username"
                  className="mb-1.5 block text-sm font-semibold text-neutral-700"
                >
                  {t("usernameLabel")}
                </label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
                    <User className="h-4.5 w-4.5 text-neutral-400" />
                  </div>
                  <input
                    id="username"
                    name="username"
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="block w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 pl-11 text-neutral-800 placeholder-neutral-400 shadow-sm transition-all focus:border-transparent focus:outline-none focus:ring-2 focus:ring-green-500 sm:text-sm"
                    placeholder={t("usernamePlaceholder")}
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="fullName"
                  className="mb-1.5 block text-sm font-semibold text-neutral-700"
                >
                  {t("fullNameLabel")}
                </label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
                    <User className="h-4.5 w-4.5 text-neutral-400" />
                  </div>
                  <input
                    id="fullName"
                    name="fullName"
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="block w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 pl-11 text-neutral-800 placeholder-neutral-400 shadow-sm transition-all focus:border-transparent focus:outline-none focus:ring-2 focus:ring-green-500 sm:text-sm"
                    placeholder={t("fullNamePlaceholder")}
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="email"
                  className="mb-1.5 block text-sm font-semibold text-neutral-700"
                >
                  {t("emailLabel")}
                </label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
                    <Mail className="h-4.5 w-4.5 text-neutral-400" />
                  </div>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="block w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 pl-11 text-neutral-800 placeholder-neutral-400 shadow-sm transition-all focus:border-transparent focus:outline-none focus:ring-2 focus:ring-green-500 sm:text-sm"
                    placeholder={t("emailPlaceholder")}
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="password"
                  className="mb-1.5 block text-sm font-semibold text-neutral-700"
                >
                  {t("passwordLabel")}
                </label>
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
                    className="block w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 pl-11 pr-11 text-neutral-800 placeholder-neutral-400 shadow-sm transition-all focus:border-transparent focus:outline-none focus:ring-2 focus:ring-green-500 sm:text-sm"
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
              </div>

              <div>
                <label
                  htmlFor="confirmPassword"
                  className="mb-1.5 block text-sm font-semibold text-neutral-700"
                >
                  {t("confirmPasswordLabel")}
                </label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
                    <Lock className="h-4.5 w-4.5 text-neutral-400" />
                  </div>
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="block w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 pl-11 pr-11 text-neutral-800 placeholder-neutral-400 shadow-sm transition-all focus:border-transparent focus:outline-none focus:ring-2 focus:ring-green-500 sm:text-sm"
                    placeholder={t("confirmPasswordPlaceholder")}
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setShowConfirmPassword((current) => !current)
                    }
                    className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-neutral-400 transition hover:text-neutral-700"
                    aria-label={
                      showConfirmPassword
                        ? t("hidePassword")
                        : t("showPassword")
                    }
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-4.5 w-4.5" />
                    ) : (
                      <Eye className="h-4.5 w-4.5" />
                    )}
                  </button>
                </div>
              </div>

              <div className="pt-2">
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
                    t("signUpButton")
                  )}
                </Button>
              </div>
            </form>
          </section>
        </div>
      </div>
    </div>
  );
}
