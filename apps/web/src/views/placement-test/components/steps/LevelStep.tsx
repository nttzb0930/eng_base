"use client";

import { useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { HelpCircle } from "lucide-react";
import { Button } from "@/src/components/ui/button";
import { cn } from "@/src/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/src/components/ui/dialog";

type LevelStepProps = {
  selectedLangs: string[];
  selectedLevels: Record<string, string>;
  onSelectLevel: (langId: string, level: string) => void;
  onStartTest: () => void;
};

type LanguageMetadata = {
  id: string;
  nameKey: string;
  nativeName: string;
  flagCode: string;
  isBeta?: boolean;
  levels: string[];
};

const LANGUAGES_METADATA: Record<string, LanguageMetadata> = {
  en: { id: "en", nameKey: "step1.langEnglish", nativeName: "English", flagCode: "gb", levels: ["A1", "A2", "B1", "B2", "C1", "C2"] },
  ja: { id: "ja", nameKey: "step1.langJapanese", nativeName: "日本語", flagCode: "jp", isBeta: true, levels: ["N5", "N4", "N3", "N2", "N1"] },
  de: { id: "de", nameKey: "step1.langGerman", nativeName: "Deutsch", flagCode: "de", levels: ["A1", "A2", "B1", "B2", "C1", "C2"] },
  zh: { id: "zh", nameKey: "step1.langChinese", nativeName: "中文", flagCode: "cn", levels: ["HSK 1", "HSK 2", "HSK 3", "HSK 4", "HSK 5", "HSK 6"] },
  ko: { id: "ko", nameKey: "step1.langKorean", nativeName: "한국어", flagCode: "kr", levels: ["TOPIK 1", "TOPIK 2", "TOPIK 3", "TOPIK 4", "TOPIK 5", "TOPIK 6"] },
};

// Static descriptions for JA, ZH, KO based on locale
const STATIC_DESCRIPTIONS: Record<string, Record<string, Record<string, string>>> = {
  vi: {
    ja: {
      N5: "Hiểu câu cơ bản, ~100 kanji.",
      N4: "Giao tiếp đơn giản, ~300 kanji.",
      N3: "Hiểu hội thoại hàng ngày, ~650 kanji.",
      N2: "Đọc báo, hiểu nội dung phức tạp, ~1000 kanji.",
      N1: "Thành thạo mọi ngữ cảnh, ~2000 kanji.",
    },
    zh: {
      "HSK 1": "Cơ bản nhất, hiểu từ vựng đơn giản.",
      "HSK 2": "Giao tiếp đơn giản hàng ngày.",
      "HSK 3": "Đọc hiểu, giao tiếp cơ bản trong đời sống.",
      "HSK 4": "Thảo luận trôi chảy nhiều chủ đề.",
      "HSK 5": "Đọc báo, xem phim không cần phụ đề.",
      "HSK 6": "Thành thạo, diễn đạt ý kiến chuyên sâu.",
    },
    ko: {
      "TOPIK 1": "Cơ bản nhất, chào hỏi đơn giản.",
      "TOPIK 2": "Giao tiếp cơ bản về đời sống.",
      "TOPIK 3": "Giao tiếp xã hội cơ bản.",
      "TOPIK 4": "Đọc hiểu báo chí, giao tiếp trôi chảy.",
      "TOPIK 5": "Sử dụng trong nghiên cứu hoặc công việc.",
      "TOPIK 6": "Thành thạo như người bản xứ.",
    },
  },
  en: {
    ja: {
      N5: "Understand basic sentences, ~100 kanji.",
      N4: "Simple communication, ~300 kanji.",
      N3: "Understand daily conversations, ~650 kanji.",
      N2: "Read news, understand complex content, ~1000 kanji.",
      N1: "Master all contexts, ~2000 kanji.",
    },
    zh: {
      "HSK 1": "Very basic, understand simple vocabulary.",
      "HSK 2": "Simple daily communication.",
      "HSK 3": "Read and communicate basic life topics.",
      "HSK 4": "Discuss fluidly on a wide range of topics.",
      "HSK 5": "Read newspapers, watch movies without subtitles.",
      "HSK 6": "Proficient, express in-depth opinions.",
    },
    ko: {
      "TOPIK 1": "Very basic, simple greetings.",
      "TOPIK 2": "Basic communication about daily life.",
      "TOPIK 3": "Basic social communication.",
      "TOPIK 4": "Read news, communicate fluently.",
      "TOPIK 5": "Use in research or work environments.",
      "TOPIK 6": "Mastery like a native speaker.",
    },
  },
};

export default function LevelStep({
  selectedLangs,
  selectedLevels,
  onSelectLevel,
  onStartTest,
}: LevelStepProps) {
  const t = useTranslations("placementTest");
  const locale = useLocale();
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  // Fallback for static descriptions if not found
  const getLevelDescription = (langId: string, level: string) => {
    if (langId === "en" || langId === "de") {
      // CEFR descriptions are in JSON files
      return t(`newOnboarding.step2.desc${level}`);
    }
    const currentLocale = locale === "vi" ? "vi" : "en";
    return STATIC_DESCRIPTIONS[currentLocale]?.[langId]?.[level] || level;
  };

  return (
    <div className="flex-1 flex flex-col justify-center gap-4">
      {selectedLangs.map((langId) => {
        const metadata = LANGUAGES_METADATA[langId];
        if (!metadata) return null;

        const currentLevel = selectedLevels[langId] || metadata.levels[0];

        return (
          <div
            key={langId}
            className="rounded-2xl border border-slate-200 bg-white p-5 flex flex-col gap-4 shadow-sm"
          >
            {/* Header: flag, translated name, native name, beta badge */}
            <div className="flex items-center gap-3">
              <img
                src={`https://hatscripts.github.io/circle-flags/flags/${metadata.flagCode}.svg`}
                alt={metadata.nativeName}
                className="w-7 h-7 rounded-full shadow-sm border border-slate-100 object-cover flex-shrink-0"
              />
              <span className="font-extrabold text-slate-800 text-sm sm:text-base">
                {t(`newOnboarding.${metadata.nameKey}`)}
              </span>
              <span className="text-xs text-slate-400 font-semibold">- {metadata.nativeName}</span>
              {metadata.isBeta && (
                <span className="bg-amber-50 border border-amber-200 text-amber-800 text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider">
                  {t("newOnboarding.step1.beta")}
                </span>
              )}
            </div>

            {/* Level selector buttons */}
            <div
              className="grid gap-2"
              style={{ gridTemplateColumns: `repeat(${metadata.levels.length}, minmax(0, 1fr))` }}
            >
              {metadata.levels.map((lvl) => {
                const isSelected = currentLevel === lvl;
                return (
                  <button
                    key={lvl}
                    type="button"
                    onClick={() => onSelectLevel(langId, lvl)}
                    className={cn(
                      "py-2 rounded-xl font-black text-xs border-2 transition-all shadow-sm active:translate-y-px whitespace-nowrap",
                      isSelected
                        ? "bg-sky-500 border-sky-600 text-white"
                        : "bg-white border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                    )}
                  >
                    {lvl}
                  </button>
                );
              })}
            </div>

            {/* Description under buttons inside the card */}
            <div className="text-slate-500 text-xs font-semibold leading-relaxed px-1">
              {getLevelDescription(langId, currentLevel)}
            </div>
          </div>
        );
      })}

      {/* Placement Test Callout - Only if English is selected */}
      {selectedLangs.includes("en") && (
        <div className="mt-2 border border-dashed border-sky-300/80 bg-sky-50/30 rounded-2xl p-5 flex flex-col sm:flex-row items-center gap-4 justify-between">
          <div className="flex items-start gap-3 text-left">
            <HelpCircle className="h-5 w-5 text-sky-500 mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="text-sm font-bold text-slate-800">{t("newOnboarding.step2.notSureTitle")}</h4>
              <p className="text-xs text-slate-500 leading-normal mt-0.5 font-medium">
                {t("newOnboarding.step2.notSureDesc")}
              </p>
            </div>
          </div>
          <Button
            type="button"
            variant="primaryOutline"
            onClick={() => setIsConfirmOpen(true)}
            className="w-full sm:w-auto h-9 text-xs font-bold shrink-0 rounded-xl shadow-sm"
          >
            {t("newOnboarding.step2.takeTestCTA")}
          </Button>
        </div>
      )}

      <Dialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
        <DialogContent closeLabel={t("newOnboarding.step2.confirmModalCancel")} className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-black text-slate-800 flex items-center gap-2">
              🎯 {t("newOnboarding.step2.confirmModalTitle")}
            </DialogTitle>
            <DialogDescription className="text-sm text-slate-500 font-medium leading-relaxed mt-2">
              {t("newOnboarding.step2.confirmModalDesc")}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex sm:flex-row gap-2 mt-4">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setIsConfirmOpen(false)}
              className="flex-1 sm:flex-none font-bold rounded-xl"
            >
              {t("newOnboarding.step2.confirmModalCancel")}
            </Button>
            <Button
              type="button"
              variant="primary"
              onClick={() => {
                setIsConfirmOpen(false);
                onStartTest();
              }}
              className="flex-1 sm:flex-none font-bold bg-sky-500 hover:bg-sky-600 text-white rounded-xl"
            >
              {t("newOnboarding.step2.confirmModalStart")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
