"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useAudio, useKey } from "react-use";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import {
  confirmLevelAction,
  getNextQuestionAction,
  resetTestAction,
  submitAnswerAction,
} from "@/src/services/placement-test/placement-test.service";
import type {
  PlacementTestResponse,
  PlacementTestQuestion,
} from "@repo/shared/placement-test";

export function usePlacementTest(initialData: PlacementTestResponse | null) {
  const router = useRouter();
  const t = useTranslations("placementTest");
  const [pending, startTransition] = useTransition();

  // State quản lý session
  const [session, setSession] = useState<PlacementTestResponse | null>(initialData);
  const [selectedOptionId, setSelectedOptionId] = useState<number | undefined>(undefined);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [answeredState, setAnsweredState] = useState<"unanswered" | "checking" | "showing_result">("unanswered");

  // Âm thanh phụ trợ
  const [correctAudio, , correctControls] = useAudio({ src: "/correct.wav" });
  const [incorrectAudio, , incorrectControls] = useAudio({ src: "/incorrect.wav" });

  const isQuestionSession = session?.status === "IN_PROGRESS";
  const questionSession = isQuestionSession ? (session as PlacementTestQuestion) : null;
  const challenge = questionSession?.challenge;
  const options = challenge?.options || [];

  // Hàm chuyển đổi thông điệp lỗi của API thành chuỗi dịch đa ngôn ngữ
  const getErrorMessage = (err: unknown, defaultMessageKey: string) => {
    try {
      const errorMsg = err instanceof Error ? err.message : String(err);
      let errorCode = errorMsg;
      if (errorMsg.trim().startsWith("{")) {
        const parsed = JSON.parse(errorMsg);
        if (parsed.message) {
          errorCode = parsed.message;
        }
      }

      const validErrorCodes = [
        "PLACEMENT_TEST_NO_QUESTIONS",
        "SESSION_NOT_RUNNING",
        "INVALID_OPTION",
        "SESSION_NOT_COMPLETED",
        "INVALID_LEVEL"
      ];

      if (validErrorCodes.includes(errorCode)) {
        return t(`errors.${errorCode}`);
      }
    } catch {}
    return t(defaultMessageKey);
  };

  // Phản hồi chọn đáp án
  const handleSelectOption = (id: number) => {
    if (answeredState !== "unanswered") return;
    setSelectedOptionId(id);
  };

  // Thiết lập phím tắt
  useKey("1", () => options[0] && handleSelectOption(options[0].id), {}, [options, answeredState]);
  useKey("2", () => options[1] && handleSelectOption(options[1].id), {}, [options, answeredState]);
  useKey("3", () => options[2] && handleSelectOption(options[2].id), {}, [options, answeredState]);
  useKey("4", () => options[3] && handleSelectOption(options[3].id), {}, [options, answeredState]);

  // Phát âm thanh của thử thách
  const playQuestionAudio = () => {
    if (challenge?.audioUrl) {
      const audio = new Audio(challenge.audioUrl);
      void audio.play();
    }
  };

  // Bỏ qua bài kiểm tra
  const handleSkip = () => {
    router.push("/courses");
  };

  // Đi tiếp (gửi đáp án hoặc lấy câu tiếp theo)
  const handleContinue = () => {
    if (pending) return;

    if (answeredState === "showing_result") {
      startTransition(async () => {
        try {
          const data = await getNextQuestionAction();
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
        const result = await submitAnswerAction(challenge.id, selectedOptionId);

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

  // Xác nhận cấp độ
  const handleConfirmLevel = (
    level: string,
    languages?: string[],
    goals?: string[],
    intensity?: string,
    primaryLanguage?: string,
    customGoal?: string,
  ) => {
    startTransition(async () => {
      try {
        await confirmLevelAction(level, languages, goals, intensity, primaryLanguage, customGoal);
        toast.success(t("toast.confirmSuccess", { level }));
        router.push("/learn");
      } catch (err) {
        toast.error(getErrorMessage(err, "toast.confirmError"));
      }
    });
  };

  // Làm lại từ đầu
  const handleReset = () => {
    if (window.confirm(t("toast.resetConfirm"))) {
      startTransition(async () => {
        try {
          await resetTestAction();
          toast.success(t("toast.resetSuccess"));
          router.refresh();
        } catch (err) {
          toast.error(getErrorMessage(err, "toast.resetError"));
        }
      });
    }
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
    handleSelectOption,
    playQuestionAudio,
    handleSkip,
    handleContinue,
    handleConfirmLevel,
    handleReset,
  };
}
