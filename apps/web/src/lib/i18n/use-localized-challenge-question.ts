"use client";

import { useCallback } from "react";

import { useTranslations } from "next-intl";

type LocalizableChallengeQuestion = {
  direction: string | null;
  question: string;
  vocabularyItem?: {
    word: string;
    primaryMeaningVi: string;
  } | null;
  word?: string | null;
  primaryMeaningVi?: string | null;
};

export const useLocalizedChallengeQuestion = () => {
  const t = useTranslations("lesson");

  return useCallback(
    (challenge: LocalizableChallengeQuestion) => {
      const word = challenge.vocabularyItem?.word ?? challenge.word;
      const meaning =
        challenge.vocabularyItem?.primaryMeaningVi ??
        challenge.primaryMeaningVi;

      if (challenge.direction === "EN_TO_VI" && word) {
        return t("questionEnToVi", { word });
      }
      if (challenge.direction === "VI_TO_EN" && meaning) {
        return t("questionViToEn", { meaning });
      }
      return challenge.question;
    },
    [t]
  );
};
