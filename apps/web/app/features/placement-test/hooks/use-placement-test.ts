"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useAudio, useKey } from "react-use";
import { toast } from "sonner";

import { useAuth } from "@/app/features/auth/hooks/use-auth";
import { courseKeys } from "@/app/features/courses/hooks/use-courses";
import { progressKeys } from "@/app/features/progress/hooks/use-user-progress";
import { useCurrentLocale } from "@/app/i18n/use-current-locale";
import { withLocale } from "@/app/i18n/paths";

import { placementTestApi } from "../api/placement-test.api";
import type {
  ConfirmPlacementLevelInput,
  PlacementTestQuestion,
  PlacementTestResponse,
  UpdateOnboardingInput,
} from "../types/placement-test.types";

export const placementTestKeys = {
  all: ["placement-test"] as const,
  question: ["placement-test", "question"] as const,
};

export function useUpdatePlacementOnboarding() {
  return useMutation({
    mutationFn: (input: UpdateOnboardingInput) =>
      placementTestApi.updateOnboarding(input),
  });
}

export function usePlacementTest() {
  const router = useRouter();
  const locale = useCurrentLocale();
  const { status: authStatus } = useAuth();
  const queryClient = useQueryClient();
  const t = useTranslations("placementTest");
  const [pending, startTransition] = useTransition();

  const [session, setSession] = useState<PlacementTestResponse | null>(null);
  const [selectedOptionId, setSelectedOptionId] = useState<
    number | undefined
  >(undefined);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [answeredState, setAnsweredState] = useState<
    "unanswered" | "checking" | "showing_result"
  >("unanswered");

  const initialQuestionQuery = useQuery({
    queryKey: placementTestKeys.question,
    queryFn: placementTestApi.nextQuestion,
    enabled: authStatus === "authenticated",
    retry: false,
  });

  const [correctAudio, , correctControls] = useAudio({ src: "/correct.wav" });
  const [incorrectAudio, , incorrectControls] = useAudio({
    src: "/incorrect.wav",
  });

  useEffect(() => {
    if (!initialQuestionQuery.data) return;
    setSession(initialQuestionQuery.data);
    setSelectedOptionId(undefined);
    setIsCorrect(null);
    setAnsweredState("unanswered");
  }, [initialQuestionQuery.data]);

  const isQuestionSession = session?.status === "IN_PROGRESS";
  const questionSession = isQuestionSession
    ? (session as PlacementTestQuestion)
    : null;
  const challenge = questionSession?.challenge;
  const options = challenge?.options ?? [];

  const getErrorMessage = (err: unknown, defaultMessageKey: string) => {
    try {
      const errorMsg = err instanceof Error ? err.message : String(err);
      let errorCode = errorMsg;
      if (errorMsg.trim().startsWith("{")) {
        const parsed = JSON.parse(errorMsg) as { message?: string };
        if (parsed.message) errorCode = parsed.message;
      }

      const validErrorCodes = [
        "PLACEMENT_TEST_NO_QUESTIONS",
        "SESSION_NOT_RUNNING",
        "INVALID_OPTION",
        "SESSION_NOT_COMPLETED",
        "INVALID_LEVEL",
      ];

      if (validErrorCodes.includes(errorCode)) {
        return t(`errors.${errorCode}`);
      }
    } catch {}
    return t(defaultMessageKey);
  };

  const handleSelectOption = (id: number) => {
    if (answeredState !== "unanswered") return;
    setSelectedOptionId(id);
  };

  useKey("1", () => options[0] && handleSelectOption(options[0].id), {}, [
    options,
    answeredState,
  ]);
  useKey("2", () => options[1] && handleSelectOption(options[1].id), {}, [
    options,
    answeredState,
  ]);
  useKey("3", () => options[2] && handleSelectOption(options[2].id), {}, [
    options,
    answeredState,
  ]);
  useKey("4", () => options[3] && handleSelectOption(options[3].id), {}, [
    options,
    answeredState,
  ]);

  const playQuestionAudio = () => {
    if (!challenge?.audioUrl) return;
    const audio = new Audio(challenge.audioUrl);
    void audio.play();
  };

  const handleSkip = () => {
    router.push(withLocale("/courses", locale));
  };

  const handleContinue = () => {
    if (pending) return;

    if (answeredState === "showing_result") {
      startTransition(async () => {
        try {
          const data = await placementTestApi.nextQuestion();
          queryClient.setQueryData(placementTestKeys.question, data);
          setSession(data);
          setSelectedOptionId(undefined);
          setIsCorrect(null);
          setAnsweredState("unanswered");
        } catch (err) {
          toast.error(getErrorMessage(err, "toast.nextQuestionError"));
        }
      });
      return;
    }

    if (!selectedOptionId || !challenge) return;

    startTransition(async () => {
      try {
        const result = await placementTestApi.submitAnswer({
          challengeId: challenge.id,
          selectedOptionId,
        });

        setIsCorrect(result.isCorrect);
        setAnsweredState("showing_result");

        if (result.isCorrect) {
          void correctControls.play();
        } else {
          void incorrectControls.play();
        }

        if (result.status === "COMPLETED") {
          setSession(result);
        }
      } catch (err) {
        toast.error(getErrorMessage(err, "toast.submitAnswerError"));
      }
    });
  };

  const handleConfirmLevel = (
    level: string,
    languages?: string[],
    goals?: string[],
    intensity?: string,
    primaryLanguage?: string,
    customGoal?: string,
  ) => {
    const input: ConfirmPlacementLevelInput = {
      level,
      languages,
      goals,
      intensity,
      primaryLanguage,
      customGoal,
    };

    startTransition(async () => {
      try {
        await placementTestApi.confirmLevel(input);
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: placementTestKeys.all }),
          queryClient.invalidateQueries({ queryKey: progressKeys.all }),
          queryClient.invalidateQueries({ queryKey: courseKeys.all }),
        ]);
        toast.success(t("toast.confirmSuccess", { level }));
        router.push(withLocale("/learn", locale));
      } catch (err) {
        toast.error(getErrorMessage(err, "toast.confirmError"));
      }
    });
  };

  const handleReset = () => {
    if (!window.confirm(t("toast.resetConfirm"))) return;

    startTransition(async () => {
      try {
        await placementTestApi.reset();
        setSession(null);
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: placementTestKeys.all }),
          queryClient.invalidateQueries({ queryKey: progressKeys.all }),
        ]);
        toast.success(t("toast.resetSuccess"));
      } catch (err) {
        toast.error(getErrorMessage(err, "toast.resetError"));
      }
    });
  };

  return {
    t,
    session,
    selectedOptionId,
    isCorrect,
    answeredState,
    pending,
    options,
    challenge,
    questionSession,
    correctAudio,
    incorrectAudio,
    initialQuestionQuery,
    isInitialLoading:
      authStatus !== "authenticated" ||
      (initialQuestionQuery.isPending && !session),
    hasInitialError: initialQuestionQuery.isError && !session,
    handleSelectOption,
    playQuestionAudio,
    handleSkip,
    handleContinue,
    handleConfirmLevel,
    handleReset,
  };
}
