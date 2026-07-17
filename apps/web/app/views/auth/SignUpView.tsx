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
import { Loader2, Mail, Lock, User } from "lucide-react";
import Image from "next/image";

export function SignUpView() {
  const router = useRouter();
  const t = useTranslations("auth");
  const locale = useCurrentLocale();
  const { register } = useAuth();
  const [username, setUsername] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !fullName || !email || !password) {
      toast.error(t("requiredFieldsError"));
      return;
    }

    setLoading(true);
    try {
      await register({ username, email, password, fullName });

      toast.success(t("signUpSuccess"));
      router.push(withLocale("/sign-in", locale));
    } catch (error) {
      if (error instanceof Error && error.message === "USER_ALREADY_EXISTS") {
        toast.error(t("userExistsError"));
      } else {
        toast.error(error instanceof Error ? error.message : t("signUpFailedError"));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col lg:flex-row bg-white">
      {/* Left side: Branding & Hero - Hidden on Mobile */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-gradient-to-br from-green-600 via-emerald-600 to-teal-700 flex-col justify-between p-12 text-white overflow-hidden">
        {/* Subtle grid pattern overlay */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-white/10 via-transparent to-transparent pointer-events-none" />
        
        {/* Top Logo */}
        <Link href="/" className="flex items-center gap-x-3 z-10">
          <Image
            src="/mascot.svg"
            alt="Mascot"
            height={44}
            width={44}
            className="drop-shadow-md"
          />
          <h1 className="text-3xl font-extrabold tracking-wide text-white drop-shadow-sm">
            VoCaBu
          </h1>
        </Link>

        {/* Mascot Center Illustration */}
        <div className="flex flex-col items-center justify-center flex-grow py-12 z-10">
          <div className="relative w-[320px] h-[320px] hover:scale-105 transition-transform duration-500 ease-out">
            <Image src="/hero.svg" alt="Hero Illustration" fill className="object-contain" priority />
          </div>
          <h2 className="text-3xl font-bold text-center max-w-md mt-8 leading-tight">
            {t("signUpSlogan")}
          </h2>
          <p className="text-green-100 text-center max-w-sm mt-3 text-sm font-medium">
            {t("signUpSloganDesc")}
          </p>
        </div>

        {/* Footer info */}
        <div className="text-xs text-green-200 z-10">
          © {new Date().getFullYear()} VoCaBu.
        </div>
      </div>

      {/* Right side: Register Form */}
      <div className="w-full lg:w-1/2 flex flex-col justify-center px-6 py-12 sm:px-12 lg:px-20 bg-slate-50 lg:bg-white">
        <div className="mx-auto w-full max-w-md">
          {/* Logo visible only on Mobile */}
          <div className="flex justify-center lg:hidden mb-8">
            <Link href="/" className="flex items-center gap-x-3">
              <Image
                src="/mascot.svg"
                alt="Mascot"
                height={40}
                width={40}
              />
              <h1 className="text-2xl font-extrabold tracking-wide text-green-600">
                VoCaBu
              </h1>
            </Link>
          </div>

          <div className="text-center lg:text-left">
            <h2 className="text-3xl font-extrabold text-neutral-800 tracking-tight">
              {t("signUpTitle")}
            </h2>
            <p className="mt-3 text-sm text-neutral-600">
              {t("hasAccount")}{" "}
              <Link
                href="/sign-in"
                className="font-semibold text-green-600 hover:text-green-500 transition-colors"
              >
                {t("signInHere")}
              </Link>
            </p>
          </div>

          <div className="mt-10">
            <form className="space-y-5" onSubmit={handleSubmit}>
              <div>
                <label
                  htmlFor="username"
                  className="block text-sm font-semibold text-neutral-700 mb-1.5"
                >
                  {t("usernameLabel")}
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <User className="h-4.5 w-4.5 text-neutral-400" />
                  </div>
                  <input
                    id="username"
                    name="username"
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="pl-11 block w-full px-3.5 py-3 border border-slate-200 rounded-xl text-neutral-800 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent sm:text-sm transition-all shadow-sm bg-white"
                    placeholder={t("usernamePlaceholder")}
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="fullName"
                  className="block text-sm font-semibold text-neutral-700 mb-1.5"
                >
                  {t("fullNameLabel")}
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <User className="h-4.5 w-4.5 text-neutral-400" />
                  </div>
                  <input
                    id="fullName"
                    name="fullName"
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="pl-11 block w-full px-3.5 py-3 border border-slate-200 rounded-xl text-neutral-800 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent sm:text-sm transition-all shadow-sm bg-white"
                    placeholder={t("fullNamePlaceholder")}
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-semibold text-neutral-700 mb-1.5"
                >
                  {t("emailLabel")}
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <Mail className="h-4.5 w-4.5 text-neutral-400" />
                  </div>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-11 block w-full px-3.5 py-3 border border-slate-200 rounded-xl text-neutral-800 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent sm:text-sm transition-all shadow-sm bg-white"
                    placeholder={t("emailPlaceholder")}
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="password"
                  className="block text-sm font-semibold text-neutral-700 mb-1.5"
                >
                  {t("passwordLabel")}
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <Lock className="h-4.5 w-4.5 text-neutral-400" />
                  </div>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-11 block w-full px-3.5 py-3 border border-slate-200 rounded-xl text-neutral-800 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent sm:text-sm transition-all shadow-sm bg-white"
                    placeholder={t("passwordPlaceholder")}
                  />
                </div>
              </div>

              <div className="pt-2">
                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl text-sm font-bold text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-all shadow-md active:scale-98"
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
          </div>
        </div>
      </div>
    </div>
  );
}
