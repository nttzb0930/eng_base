"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type ClipboardEvent,
  type KeyboardEvent,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { ArrowLeft, CheckCircle2, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/app/components/ui/button";
import { LocalizedLink as Link } from "@/app/components/navigation/LocalizedLink";
import { authApi } from "@/app/features/auth/api/auth.api";
import { useCurrentLocale } from "@/app/i18n/use-current-locale";
import { withLocale } from "@/app/i18n/paths";
import Image from "next/image";

import { AuthBrandPanel } from "./components/AuthBrandPanel";

const appName = process.env.NEXT_PUBLIC_APP_NAME?.trim() || "English Base";

export function VerifyEmailView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const locale = useCurrentLocale();
  const t = useTranslations("auth");
  const initialEmail = useMemo(
    () => searchParams.get("email") ?? "",
    [searchParams]
  );
  const email = initialEmail;
  const [digits, setDigits] = useState<string[]>(() =>
    Array.from({ length: 6 }, () => "")
  );
  const code = digits.join("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = window.setInterval(() => {
      setResendCooldown((current) => Math.max(0, current - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [resendCooldown]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!email || code.length !== 6) {
      toast.error(t("verificationRequired"));
      return;
    }
    setLoading(true);
    try {
      await authApi.verifyEmail({ email, code });
      toast.success(t("verificationSuccess"));
      router.push(withLocale("/sign-in", locale));
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : t("verificationFailed")
      );
    } finally {
      setLoading(false);
    }
  }

  function updateDigits(value: string, startIndex = 0) {
    const values = value
      .replace(/\D/g, "")
      .slice(0, 6 - startIndex)
      .split("");
    setDigits((current) => {
      const next = [...current];
      values.forEach((digit, offset) => {
        next[startIndex + offset] = digit;
      });
      return next;
    });
    const nextIndex = Math.min(startIndex + values.length, 5);
    inputRefs.current[nextIndex]?.focus();
  }

  function handlePaste(event: ClipboardEvent<HTMLInputElement>) {
    event.preventDefault();
    updateDigits(event.clipboardData.getData("text"), 0);
  }

  function handleKeyDown(
    index: number,
    event: KeyboardEvent<HTMLInputElement>
  ) {
    if (event.key === "Backspace" && !digits[index] && index > 0) {
      event.preventDefault();
      setDigits((current) => {
        const next = [...current];
        next[index - 1] = "";
        return next;
      });
      inputRefs.current[index - 1]?.focus();
    }
    if (event.key === "ArrowLeft" && index > 0)
      inputRefs.current[index - 1]?.focus();
    if (event.key === "ArrowRight" && index < 5)
      inputRefs.current[index + 1]?.focus();
  }

  async function resend() {
    if (!email) {
      toast.error(t("emailRequired"));
      return;
    }
    setResending(true);
    try {
      await authApi.resendVerification(email);
      setResendCooldown(60);
      toast.success(t("verificationResent"));
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : t("verificationFailed")
      );
    } finally {
      setResending(false);
    }
  }

  return (
    <main className="flex min-h-screen w-full flex-col bg-white lg:flex-row lg:items-start">
      <AuthBrandPanel />

      <div className="flex min-h-screen w-full flex-col justify-center overflow-y-auto bg-slate-50 px-4 py-8 sm:px-6 sm:py-12 lg:w-1/2 lg:bg-white lg:px-20">
        <div className="mx-auto w-full max-w-[440px]">
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

          <section className="animate-page-enter rounded-md border border-slate-200 bg-white p-6 text-center shadow-[0_18px_45px_-28px_rgba(15,23,42,0.45)] sm:p-8">
            <div className="flex items-center justify-between">
              <Link
                href="/sign-in"
                className="flex w-fit items-center gap-2 text-sm text-slate-500 transition hover:text-slate-800"
              >
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                {t("backToSignIn")}
              </Link>
              <span className="rounded-md bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                1 / 1
              </span>
            </div>
            <h1 className="mt-6 text-2xl font-bold tracking-tight text-slate-900 sm:text-[28px]">
              {t("verificationTitle")}
            </h1>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              {t("verificationDescription")}
            </p>
            {email && (
              <div className="mt-4 flex items-center gap-2 rounded-md border border-emerald-100 bg-emerald-50/70 px-3 py-2.5 text-sm text-emerald-800">
                <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span className="truncate">{email}</span>
              </div>
            )}

            <form onSubmit={submit} className="mt-6 space-y-5">
              <div>
                <div className="flex items-center justify-between gap-4 text-left">
                  <label className="text-sm font-semibold text-slate-800">
                    {t("verificationCodeLabel")}
                  </label>
                  <span className="text-xs text-slate-500">
                    {t("verificationCodeHelper")}
                  </span>
                </div>
                <div
                  className="mt-3 grid grid-cols-6 gap-2 sm:gap-3"
                  role="group"
                  aria-label={t("verificationCodeLabel")}
                >
                  {digits.map((digit, index) => (
                    <input
                      key={index}
                      ref={(element) => {
                        inputRefs.current[index] = element;
                      }}
                      type="text"
                      inputMode="numeric"
                      autoComplete={index === 0 ? "one-time-code" : "off"}
                      maxLength={1}
                      value={digit}
                      aria-label={`${t("verificationCodeLabel")} ${index + 1}`}
                      onPaste={handlePaste}
                      onKeyDown={(event) => handleKeyDown(index, event)}
                      onChange={(event) =>
                        updateDigits(event.target.value, index)
                      }
                      className="h-12 w-full rounded-md border border-slate-300 bg-white text-center text-xl font-semibold text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                    />
                  ))}
                </div>
              </div>
              <Button
                type="submit"
                disabled={loading || !email || code.length !== 6}
                className="h-11 w-full rounded-md"
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {t("verifyButton")}
              </Button>
            </form>

            <Button
              type="button"
              variant="outline"
              disabled={resending || resendCooldown > 0}
              onClick={() => void resend()}
              className="mt-3 h-11 w-full rounded-md"
            >
              {resending
                ? t("processing")
                : resendCooldown > 0
                  ? `${t("resendVerification")} (${resendCooldown}s)`
                  : t("resendVerification")}
            </Button>
          </section>
        </div>
      </div>
    </main>
  );
}
