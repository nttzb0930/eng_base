"use client";

import { useTranslations } from "next-intl";
import { Sparkles } from "lucide-react";
import { cn } from "@/app/utils/cn";
import { motion, AnimatePresence } from "framer-motion";

type LanguageOption = {
  id: string;
  nameKey: string;
  nativeName: string;
  flagCode: string;
  isBeta?: boolean;
};

const LANGUAGES: LanguageOption[] = [
  { id: "en", nameKey: "step1.langEnglish", nativeName: "English", flagCode: "gb" },
  { id: "ja", nameKey: "step1.langJapanese", nativeName: "日本語", flagCode: "jp", isBeta: true },
  { id: "de", nameKey: "step1.langGerman", nativeName: "Deutsch", flagCode: "de" },
  { id: "zh", nameKey: "step1.langChinese", nativeName: "中文", flagCode: "cn" },
  { id: "ko", nameKey: "step1.langKorean", nativeName: "한국어", flagCode: "kr" },
];

type LanguageStepProps = {
  selectedLangs: string[];
  onToggleLang: (id: string) => void;
  primaryLang: string | null;
  onSetPrimary: (id: string) => void;
};

export default function LanguageStep({
  selectedLangs,
  onToggleLang,
  primaryLang,
  onSetPrimary,
}: LanguageStepProps) {
  const t = useTranslations("placementTest");

  return (
    <div className="flex-1 flex flex-col">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start mt-2">
        {LANGUAGES.map((lang) => {
          const isSelected = selectedLangs.includes(lang.id);
          const isPrimary = primaryLang === lang.id;
          return (
            <div
              key={lang.id}
              onClick={() => onToggleLang(lang.id)}
              className={cn(
                "group cursor-pointer rounded-2xl border-2 p-5 flex flex-col justify-between transition-all duration-200",
                isSelected
                  ? "border-sky-500 bg-sky-50/30 text-sky-700 shadow-sm"
                  : "border-slate-100 bg-white hover:border-sky-400 hover:shadow-sm"
              )}
            >
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-4">
                  {/* eslint-disable-next-line @next/next/no-img-element -- Remote flag SVG host is not part of the app image pipeline. */}
                  <img
                    src={`https://hatscripts.github.io/circle-flags/flags/${lang.flagCode}.svg`}
                    alt={lang.nativeName}
                    className="w-10 h-10 rounded-full shadow-sm border border-slate-100 flex-shrink-0 object-cover"
                  />
                  <div>
                    <div className="font-extrabold text-slate-800 text-[15px] leading-snug">
                      {t(`newOnboarding.${lang.nameKey}`)}
                    </div>
                    <div className="text-[12px] text-slate-400 font-medium mt-0.5">{lang.nativeName}</div>
                  </div>
                </div>

                <div
                  className={cn(
                    "h-6 w-6 rounded-full border flex items-center justify-center transition-all flex-shrink-0",
                    isSelected
                      ? "border-sky-500 bg-sky-500 text-white"
                      : "border-slate-200 bg-white group-hover:border-sky-400"
                  )}
                >
                  {isSelected && <div className="h-2 w-2 rounded-full bg-white" />}
                </div>
              </div>

              <AnimatePresence initial={false}>
                {isSelected && (
                  <motion.div
                    initial={{ height: 0, opacity: 0, marginTop: 0 }}
                    animate={{ height: "auto", opacity: 1, marginTop: 12 }}
                    exit={{ height: 0, opacity: 0, marginTop: 0 }}
                    transition={{ type: "spring", stiffness: 300, damping: 26 }}
                    className="w-full pt-2 border-t border-slate-100 overflow-hidden"
                  >
                    {isPrimary ? (
                      <motion.div
                        key="primary-badge"
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ type: "spring", stiffness: 350, damping: 15 }}
                        className="w-full text-center bg-sky-500 text-white text-[11px] font-extrabold py-1 px-3 rounded-lg flex items-center justify-center gap-1 shadow-sm uppercase tracking-wider"
                      >
                        <motion.span
                          animate={{
                            scale: [1, 1.25, 1.25, 1, 1],
                            rotate: [0, 15, -15, 0, 0]
                          }}
                          transition={{
                            repeat: Infinity,
                            repeatType: "loop",
                            repeatDelay: 2.5,
                            duration: 0.6
                          }}
                          className="inline-block text-yellow-300 drop-shadow-[0_1px_1px_rgba(0,0,0,0.1)] font-bold text-sm"
                        >
                          ★
                        </motion.span>
                        <span>{t("newOnboarding.step1.primaryLang")}</span>
                      </motion.div>
                    ) : (
                      <motion.button
                        key="set-primary-btn"
                        whileTap={{ scale: 0.97 }}
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSetPrimary(lang.id);
                        }}
                        className="w-full text-center bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-800 text-[11px] font-extrabold py-1 px-3 rounded-lg transition uppercase tracking-wider"
                      >
                        {t("newOnboarding.step1.setAsPrimary")}
                      </motion.button>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>

      <AnimatePresence initial={false}>
        {selectedLangs.some((l) => l !== "en") && (
          <motion.div
            initial={{ height: 0, opacity: 0, marginTop: 0 }}
            animate={{ height: "auto", opacity: 1, marginTop: 24 }}
            exit={{ height: 0, opacity: 0, marginTop: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 26 }}
            className="overflow-hidden w-full"
          >
            <div className="bg-amber-50/70 border border-amber-200 text-amber-800 rounded-xl p-3.5 text-xs font-semibold leading-relaxed flex items-start gap-2.5">
              <Sparkles className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
              <span>
                {t("newOnboarding.step1.warning", {
                  course: t(`newOnboarding.step1.langEnglish`),
                })}
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
