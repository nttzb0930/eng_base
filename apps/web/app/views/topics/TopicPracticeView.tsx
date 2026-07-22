"use client";

import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import type { WeakWordsPracticeChallenge } from "@repo/shared";

import { SessionPageSkeleton } from "@/app/components/feedback/RouteSkeletons";
import { WeakWordsPracticeQuiz } from "@/app/features/practice/weak-words/PracticeQuiz";
import { useTopic } from "@/app/features/topics/hooks/use-topics";
import { useUserProgress } from "@/app/features/progress/hooks/use-user-progress";
import { withLocale } from "@/app/i18n/paths";
import { useCurrentLocale } from "@/app/i18n/use-current-locale";

type TopicPracticeViewProps = {
  slug: string;
  mode?: string;
};

export function TopicPracticeView({ slug, mode }: TopicPracticeViewProps) {
  const router = useRouter();
  const locale = useCurrentLocale();
  const userProgressQuery = useUserProgress();
  const topicQuery = useTopic(slug, locale);

  const userProgress = userProgressQuery.data;
  const topic = topicQuery.data;
  const isLoading = userProgressQuery.isLoading || topicQuery.isLoading;

  useEffect(() => {
    if (!isLoading && (!userProgress || !topic)) {
      router.replace(withLocale("/topics", locale));
    }
  }, [isLoading, locale, router, topic, userProgress]);

  const topicItems = topic?.items;
  const challenges: WeakWordsPracticeChallenge[] = useMemo(() => {
    if (!topicItems || topicItems.length === 0) return [];
    
    let itemsToPractice = [...topicItems];

    if (mode === "weak") {
      itemsToPractice = itemsToPractice.slice(0, Math.min(8, itemsToPractice.length));
    } else if (mode === "new") {
      itemsToPractice = itemsToPractice.slice(3);
    }

    if (itemsToPractice.length === 0) {
      itemsToPractice = [...topicItems];
    }

    return itemsToPractice.map((item) => {
      const shortMeaning =
        item.primaryMeaningVi && item.primaryMeaningVi.trim().length > 0
          ? item.primaryMeaningVi.trim()
          : item.meaningVi.split(";")[0]?.split(",")[0]?.trim() || item.meaningVi;

      // Generate distractors from other items in the same topic
      const otherItems = topicItems.filter((x) => x.id !== item.id);
      const shuffledOthers = [...otherItems].sort(() => Math.random() - 0.5);
      const distractors = shuffledOthers.slice(0, Math.min(3, shuffledOthers.length));
      
      const optionsList = [item, ...distractors].sort(() => Math.random() - 0.5);

      return {
        id: item.id,
        type: "SELECT" as const,
        direction: "VI_TO_EN" as const,
        question: shortMeaning,
        questionEn: `Which word means "${shortMeaning}"?`,
        questionVi: `Từ nào có nghĩa là "${shortMeaning}"?`,
        correctOptionId: item.id,
        challengeOptions: optionsList.map((opt) => ({
          id: opt.id,
          challengeId: item.id,
          text: opt.word,
          correct: opt.id === item.id,
          isCorrect: opt.id === item.id,
          imageSrc: null,
          audioSrc: null,
        })),
        vocabularyItem: {
          id: item.id,
          word: item.word,
          normalizedWord: item.word.toLowerCase(),
          pos: item.pos ?? "noun",
          posVi: null,
          cefrLevel: item.cefrLevel ?? "B1",
          phonetic: item.phonetic ?? null,
          phoneticSource: null,
          audioUrl: null,
          audioSource: null,
          exampleEn: item.exampleEn ?? null,
          exampleVi: item.exampleVi ?? null,
          exampleSource: null,
          meaningVi: item.meaningVi,
          primaryMeaningVi: shortMeaning,
          source: "topic",
          createdAt: new Date(),
          updatedAt: new Date(),
          userSavedWords: [],
          userVocabularyProgress: [],
          vocabularyExamples: [],
        },
      };
    });
  }, [topicItems, mode]);

  if (isLoading || !userProgress || !topic || challenges.length === 0) {
    return <SessionPageSkeleton embedded />;
  }

  return <WeakWordsPracticeQuiz initialChallenges={challenges} />;
}
