"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { ArrowLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";
import Image from "next/image";

import { Button } from "@/app/components/ui/button";
import { LocalizedLink as Link } from "@/app/components/navigation/LocalizedLink";
import { authApi } from "@/app/features/auth/api/auth.api";
import { useCurrentLocale } from "@/app/i18n/use-current-locale";
import { withLocale } from "@/app/i18n/paths";

import { AuthBrandPanel } from "./components/AuthBrandPanel";

const appName = process.env.NEXT_PUBLIC_APP_NAME?.trim() || "English Base";

export function ForgotPasswordView() {
  const router = useRouter();
  const locale = useCurrentLocale();
  const t = useTranslations("auth");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!email) {
      toast.error(t("emailRequired"));
      return;
    }
    setLoading(true);
    try {
      await authApi.requestPasswordReset({ email });
      router.push(
        `${withLocale("/reset-password", locale)}?email=${encodeURIComponent(email)}`
      );
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
        <div className="mx-auto w-full max-w-md">
          <div className="mb-8 flex justify-center lg:hidden">
            <Link href="/" className="flex items-center gap-x-3">
              <Image
                src="/mascot.svg"
                alt={t("mascotAlt")}
                height={40}
                width={40}
              />
              <span className="text-2xl font-extrabold tracking-wide text-green-600">
                {appName}
              </span>
            </Link>
          </div>
          <section className="animate-page-enter rounded-md border border-slate-200 bg-white p-6 text-center shadow-sm sm:p-8">
            <Link
              href="/sign-in"
              className="flex w-fit items-center gap-2 text-sm text-slate-500 transition-colors hover:text-slate-800"
            >
              <ArrowLeft className="h-4 w-4" />
              {t("backToSignIn")}
            </Link>
            <h1 className="mt-6 text-2xl font-bold tracking-tight text-slate-900">
              {t("forgotPasswordTitle")}
            </h1>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              {t("forgotPasswordDescription")}
            </p>
            <form onSubmit={submit} className="mt-6 space-y-4">
              <label className="block text-left text-sm font-semibold text-slate-800">
                {t("emailLabel")}
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="mt-2 h-11 w-full rounded-md border border-slate-300 bg-white px-3 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                  placeholder={t("emailPlaceholder")}
                />
              </label>
              <Button
                type="submit"
                disabled={loading}
                className="h-11 w-full rounded-md"
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {t("sendResetCode")}
              </Button>
            </form>
          </section>
        </div>
      </div>
    </main>
  );
}
