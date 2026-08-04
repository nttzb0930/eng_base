"use client";

import { useMemo, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { ArrowLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/app/components/ui/button";
import { LocalizedLink as Link } from "@/app/components/navigation/LocalizedLink";
import { authApi } from "@/app/features/auth/api/auth.api";
import { useCurrentLocale } from "@/app/i18n/use-current-locale";
import { withLocale } from "@/app/i18n/paths";
import { AuthBrandPanel } from "./components/AuthBrandPanel";

export function ResetPasswordView() {
  const router = useRouter();
  const locale = useCurrentLocale();
  const searchParams = useSearchParams();
  const t = useTranslations("auth");
  const initialEmail = useMemo(
    () => searchParams.get("email") ?? "",
    [searchParams]
  );
  const [email, setEmail] = useState(initialEmail);
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!email || code.length !== 6 || newPassword.length < 8) {
      toast.error(t("passwordResetRequired"));
      return;
    }
    setLoading(true);
    try {
      await authApi.resetPassword({ email, code, newPassword });
      toast.success(t("passwordResetSuccess"));
      router.push(withLocale("/sign-in", locale));
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : t("passwordResetFailed")
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen w-full flex-col bg-white lg:flex-row lg:items-start">
      <AuthBrandPanel />
      <div className="flex min-h-screen w-full flex-col justify-center overflow-y-auto bg-slate-50 px-4 py-8 sm:px-6 sm:py-12 lg:w-1/2 lg:bg-white lg:px-20">
        <section className="animate-page-enter mx-auto w-full max-w-[440px] rounded-md border border-slate-200 bg-white p-6 text-center shadow-sm sm:p-8">
          <Link
            href="/sign-in"
            className="flex w-fit items-center gap-2 text-sm text-slate-500 transition-colors hover:text-slate-800"
          >
            <ArrowLeft className="h-4 w-4" />
            {t("backToSignIn")}
          </Link>
          <h1 className="mt-6 text-2xl font-bold tracking-tight text-slate-900">
            {t("resetPasswordTitle")}
          </h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            {t("resetPasswordDescription")}
          </p>
          <form onSubmit={submit} className="mt-6 space-y-4">
            <label className="block text-left text-sm font-semibold text-slate-800">
              {t("emailLabel")}
              <input
                type="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="mt-2 h-11 w-full rounded-md border border-slate-300 px-3 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
              />
            </label>
            <label className="block text-left text-sm font-semibold text-slate-800">
              {t("verificationCodeLabel")}
              <input
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                required
                value={code}
                onChange={(event) =>
                  setCode(event.target.value.replace(/\D/g, ""))
                }
                className="mt-2 h-12 w-full rounded-md border border-slate-300 text-center text-xl font-semibold tracking-[0.45em] outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
              />
            </label>
            <label className="block text-left text-sm font-semibold text-slate-800">
              {t("newPasswordLabel")}
              <input
                type="password"
                minLength={8}
                required
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                className="mt-2 h-11 w-full rounded-md border border-slate-300 px-3 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
              />
            </label>
            <Button
              type="submit"
              disabled={loading}
              className="h-11 w-full rounded-md"
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t("resetPasswordButton")}
            </Button>
          </form>
        </section>
      </div>
    </main>
  );
}
