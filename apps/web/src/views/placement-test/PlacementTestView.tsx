"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Confetti from "react-confetti";
import { useWindowSize } from "react-use";
import {
  Volume2,
  Award,
  ArrowRight,
  BookOpen,
  Compass,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";

import { Button } from "@/src/components/ui/button";
import { cn } from "@/src/lib/utils";
import { useLocalizedChallengeQuestion } from "@/src/lib/i18n/use-localized-challenge-question";
import type { PlacementTestResponse } from "@repo/shared/placement-test";
import { usePlacementTest } from "./hooks/usePlacementTest";
import NewUserOnboarding from "./components/new-user-onboarding";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/src/components/ui/dialog";

type PlacementTestViewProps = {
  initialData: PlacementTestResponse | null;
};

export default function PlacementTestView({
  initialData,
}: PlacementTestViewProps) {
  const localizeChallengeQuestion = useLocalizedChallengeQuestion();
  const { width: confettiWidth, height: confettiHeight } = useWindowSize();
  const {
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
    handleContinue,
    handleConfirmLevel,
    handleReset,
  } = usePlacementTest(initialData);

  const isFirstQuestion =
    initialData?.status === "IN_PROGRESS" && initialData.questionNumber === 1;
  const [showIntro, setShowIntro] = useState(isFirstQuestion);
  const [isSkipModalOpen, setIsSkipModalOpen] = useState(false);
  const bypassWarning = useRef(false);

  // Warn user before reloading or leaving the page during an active test session
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (bypassWarning.current) return;
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, []);

  const handleConfirmLevelWithBypass = (
    level: string,
    languages?: string[],
    goals?: string[],
    intensity?: string,
    primaryLanguage?: string,
    customGoal?: string
  ) => {
    bypassWarning.current = true;
    handleConfirmLevel(
      level,
      languages,
      goals,
      intensity,
      primaryLanguage,
      customGoal
    );
  };

  const handleResetWithBypass = () => {
    bypassWarning.current = true;
    handleReset();
  };

  const handleContinueWithBypass = () => {
    // If completing the test on the 15th question's result screen
    if (
      questionSession &&
      questionSession.questionNumber >= 15 &&
      answeredState === "showing_result"
    ) {
      bypassWarning.current = true;
    }
    handleContinue();
  };

  // 1. Màn hình lỗi nếu không lấy được dữ liệu ban đầu
  if (initialData === null && !session) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-neutral-50 p-6 text-center">
        <div className="mb-2 flex h-16 w-16 items-center justify-center rounded-full bg-rose-100">
          <AlertTriangle className="h-8 w-8 text-rose-500" />
        </div>
        <h2 className="text-xl font-bold text-neutral-800">
          {t("errorTitle")}
        </h2>
        <p className="max-w-sm text-sm text-neutral-500">{t("errorDesc")}</p>
        <Button
          onClick={() => window.location.reload()}
          className="mt-2 rounded-xl bg-green-600 px-6 font-bold text-white hover:bg-green-700"
        >
          {t("retry")}
        </Button>
      </div>
    );
  }

  // 2. Màn hình loading khởi tạo
  if (!session) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-neutral-50 text-neutral-600">
        <RefreshCw className="h-10 w-10 animate-spin text-sky-500" />
        <p className="animate-pulse text-lg font-semibold">{t("loading")}</p>
      </div>
    );
  }

  // 2.5 Màn hình chọn điểm bắt đầu (Intro Onboarding)
  if (showIntro && isFirstQuestion) {
    return (
      <NewUserOnboarding
        onComplete={handleConfirmLevelWithBypass}
        onStartTest={() => setShowIntro(false)}
        initialStep={
          initialData && "onboardingStep" in initialData
            ? initialData.onboardingStep
            : undefined
        }
        initialData={
          initialData && "onboardingData" in initialData
            ? (initialData.onboardingData as any)
            : undefined
        }
      />
    );
  }

  // 2. Màn hình Kết thúc bài test (COMPLETED)
  if (session.status === "COMPLETED") {
    const isBuffer =
      session.inBufferZone ||
      (session.bufferOptions && session.bufferOptions.length > 0);
    const recommended = session.recommendedLevel;
    const bufferOpts = session.bufferOptions || [];

    return (
      <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-gradient-to-b from-sky-50 to-white px-4 py-8 sm:p-6">
        <Confetti
          recycle={false}
          numberOfPieces={350}
          tweenDuration={8000}
          width={confettiWidth}
          height={confettiHeight}
        />

        <div className="z-10 max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-slate-200 bg-white p-5 text-center shadow-xl sm:rounded-3xl sm:p-8 lg:p-12">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 200, damping: 15 }}
          >
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-amber-100 sm:mb-6 sm:h-20 sm:w-20">
              <Award className="h-9 w-9 text-amber-500 sm:h-12 sm:w-12" />
            </div>

            <h1 className="mb-3 text-2xl font-extrabold text-neutral-800 sm:mb-4 sm:text-3xl lg:text-4xl">
              {t("congrats")}
            </h1>
            <p className="mx-auto mb-6 max-w-md text-sm text-neutral-500 sm:mb-8 sm:text-base">
              {t("description")}
            </p>
          </motion.div>

          {isBuffer ? (
            // Luồng Vùng Đệm (Buffer Zone)
            <div className="mt-4">
              <div className="mx-auto mb-8 flex max-w-lg items-center justify-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-800">
                <AlertTriangle className="h-5 w-5 flex-shrink-0 text-amber-600" />
                <span>{t("bufferNotice")}</span>
              </div>

              <h3 className="mb-4 text-lg font-bold text-neutral-700">
                {t("chooseLevel")}
              </h3>

              <div className="mx-auto mb-8 grid max-w-lg grid-cols-1 gap-4 md:grid-cols-2">
                {bufferOpts.map((lvl: string, idx: number) => {
                  const isHigher = idx === 1;
                  return (
                    <motion.div
                      key={lvl}
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleConfirmLevelWithBypass(lvl)}
                      className={cn(
                        "flex cursor-pointer flex-col justify-between rounded-2xl border-2 border-b-4 p-5 text-left transition-colors",
                        isHigher
                          ? "border-sky-200 bg-sky-50/50 hover:bg-sky-50 active:border-b-2"
                          : "border-green-200 bg-green-50/50 hover:bg-green-50 active:border-b-2"
                      )}
                    >
                      <div>
                        <span
                          className={cn(
                            "rounded-full px-3 py-1 text-xs font-bold tracking-wider uppercase",
                            isHigher
                              ? "bg-sky-100 text-sky-700"
                              : "bg-green-100 text-green-700"
                          )}
                        >
                          {t("level", { level: lvl })}
                        </span>
                        <h4 className="mt-3 text-base font-extrabold text-neutral-800">
                          {isHigher
                            ? t("challenge", { level: lvl })
                            : t("reviewOption", { level: lvl })}
                        </h4>
                        <p className="mt-2 text-xs text-neutral-500">
                          {isHigher ? t("challengeDesc") : t("reviewDesc")}
                        </p>
                      </div>
                      <div className="mt-4 flex justify-end">
                        <ArrowRight
                          className={cn(
                            "h-5 w-5",
                            isHigher ? "text-sky-500" : "text-green-500"
                          )}
                        />
                      </div>
                    </motion.div>
                  );
                })}
              </div>
              <p className="text-xs text-neutral-400 italic">
                {t("bufferWarning", { level: bufferOpts[0] })}
              </p>
            </div>
          ) : (
            // Luồng Xếp Lớp Tự Động (Auto level recommendation)
            <div className="mt-4">
              <div className="mb-4 inline-block rounded-2xl bg-sky-100 px-6 py-3 text-2xl font-black text-sky-800 shadow-sm sm:mb-6 sm:rounded-3xl sm:px-8 sm:py-4 sm:text-3xl">
                {recommended}
              </div>

              <div className="mx-auto mb-6 flex max-w-md items-start gap-3 rounded-xl border border-sky-100 bg-sky-50/50 p-3 text-left sm:mb-8 sm:rounded-2xl sm:p-4">
                <BookOpen className="mt-0.5 h-5 w-5 flex-shrink-0 text-sky-500 sm:h-6 sm:w-6" />
                <span className="text-xs leading-relaxed font-semibold text-sky-900 sm:text-sm">
                  {t("levelRecommendation", {
                    unit:
                      recommended === "A1"
                        ? 1
                        : recommended === "A2"
                          ? 2
                          : recommended === "B1"
                            ? 3
                            : 4,
                    level: recommended,
                  })}
                </span>
              </div>

              <Button
                size="lg"
                variant="primary"
                onClick={() => handleConfirmLevelWithBypass(recommended)}
                disabled={pending}
                className="h-11 w-full max-w-sm rounded-xl text-sm shadow-md sm:h-12 sm:rounded-2xl sm:text-base"
              >
                {pending ? t("sending") : t("startLearning")}
              </Button>
            </div>
          )}

          <div className="mt-8 flex justify-center">
            <button
              onClick={handleResetWithBypass}
              disabled={pending}
              className="flex items-center gap-1 text-xs font-semibold tracking-wider text-rose-500 uppercase hover:text-rose-600 hover:underline"
            >
              {t("retakeTest")}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 3. Màn hình làm bài test bình thường (IN_PROGRESS)
  if (!challenge || !questionSession) {
    return null;
  }

  const localizedQuestion = localizeChallengeQuestion(challenge);

  const questionNumber = questionSession.questionNumber;
  const progressPercent = (questionNumber / 15) * 100;

  return (
    <div className="flex min-h-screen flex-col">
      {correctAudio}
      {incorrectAudio}

      {/* Header */}
      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
        <button
          onClick={() => setIsSkipModalOpen(true)}
          className="p-2 text-neutral-400 transition hover:text-neutral-600"
          title={t("exitTitle")}
        >
          <Compass className="h-6 w-6" />
        </button>

        {/* Progress bar */}
        <div className="relative mx-6 max-w-xl flex-1">
          <div className="h-3 w-full rounded-full border border-slate-200 bg-slate-100">
            <motion.div
              className="h-full rounded-full bg-sky-400"
              initial={{ width: 0 }}
              animate={{ width: `${progressPercent}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
          <span className="absolute top-4 right-0 text-xs font-bold text-neutral-400">
            {t("questionProgress", { questionNumber })}
          </span>
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsSkipModalOpen(true)}
          className="text-xs font-bold tracking-wider text-neutral-500 uppercase"
        >
          {t("skipTest")}
        </Button>
      </header>

      {/* Content Area */}
      <main className="flex flex-1 items-start justify-center overflow-y-auto bg-slate-50 p-3 sm:items-center sm:p-6">
        <div className="my-3 flex w-full max-w-xl flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:my-0 sm:gap-6 sm:rounded-3xl sm:p-6 lg:min-h-[420px] lg:p-10">
          <div className="flex items-start justify-between gap-3 sm:gap-4">
            <h2 className="text-base leading-tight font-black text-neutral-800 sm:text-xl lg:text-2xl">
              {localizedQuestion}
            </h2>

            {challenge.audioUrl && (
              <button
                onClick={playQuestionAudio}
                className="flex-shrink-0 rounded-2xl border border-sky-100 bg-sky-50 p-3 text-sky-500 shadow-sm transition hover:bg-sky-100 hover:text-sky-600"
                title={t("listenPronunciation")}
              >
                <Volume2 className="h-6 w-6" />
              </button>
            )}
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3">
            <AnimatePresence mode="popLayout">
              {options.map((opt, index: number) => {
                const shortcut = String(index + 1);
                const isSelected = selectedOptionId === opt.id;

                // Trạng thái hiển thị màu sắc
                let cardStatus: "none" | "correct" | "wrong" = "none";
                if (answeredState === "showing_result") {
                  if (isSelected) {
                    cardStatus = isCorrect ? "correct" : "wrong";
                  } else if (opt.correct) {
                    // Hiển thị đáp án đúng nếu trả lời sai
                    cardStatus = "correct";
                  }
                }

                return (
                  <motion.div
                    key={opt.id}
                    onClick={() => handleSelectOption(opt.id)}
                    whileHover={
                      answeredState !== "unanswered" ? {} : { scale: 1.015 }
                    }
                    whileTap={
                      answeredState !== "unanswered" ? {} : { scale: 0.985 }
                    }
                    transition={{ type: "spring", stiffness: 450, damping: 18 }}
                    className={cn(
                      "flex cursor-pointer items-center justify-between rounded-2xl border-2 border-b-4 p-4 transition-all lg:p-5",
                      isSelected &&
                        "border-sky-300 bg-sky-50/50 hover:bg-sky-50/50",
                      cardStatus === "correct" &&
                        "border-green-300 bg-green-50/50 hover:bg-green-50/50",
                      cardStatus === "wrong" &&
                        "border-rose-300 bg-rose-50/50 hover:bg-rose-50/50",
                      answeredState !== "unanswered" &&
                        !isSelected &&
                        cardStatus !== "correct" &&
                        "pointer-events-none opacity-50"
                    )}
                  >
                    <p
                      className={cn(
                        "text-sm font-semibold text-neutral-700 lg:text-base",
                        isSelected && "font-bold text-sky-600",
                        cardStatus === "correct" && "font-bold text-green-700",
                        cardStatus === "wrong" && "font-bold text-rose-700"
                      )}
                    >
                      {opt.text}
                    </p>

                    {/* Badge phím tắt */}
                    <div
                      className={cn(
                        "flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-xs font-extrabold text-neutral-400 shadow-sm",
                        isSelected && "border-sky-300 bg-white text-sky-500",
                        cardStatus === "correct" &&
                          "border-green-500 bg-white text-green-600",
                        cardStatus === "wrong" &&
                          "border-rose-500 bg-white text-rose-600"
                      )}
                    >
                      {shortcut}
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </div>
      </main>

      {/* Footer Check Banner */}
      <footer
        className={cn(
          "z-10 flex items-center justify-between border-t border-slate-200 bg-white px-4 py-3 transition-colors duration-200 sm:px-6 sm:py-5",
          answeredState === "showing_result" &&
            isCorrect &&
            "border-green-200 bg-green-50",
          answeredState === "showing_result" &&
            !isCorrect &&
            "border-rose-200 bg-rose-50"
        )}
      >
        <div className="mx-auto flex max-w-xl flex-1 items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            {answeredState === "showing_result" && (
              <>
                <div
                  className={cn(
                    "flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full shadow-sm sm:h-10 sm:w-10",
                    isCorrect
                      ? "bg-green-500 text-white"
                      : "bg-rose-500 text-white"
                  )}
                >
                  {isCorrect ? (
                    <CheckCircle2 className="h-5 w-5 sm:h-6 sm:w-6" />
                  ) : (
                    <AlertTriangle className="h-5 w-5 sm:h-6 sm:w-6" />
                  )}
                </div>
                <div className="min-w-0">
                  <h4
                    className={cn(
                      "text-xs font-black tracking-wide uppercase sm:text-sm",
                      isCorrect ? "text-green-800" : "text-rose-800"
                    )}
                  >
                    {isCorrect ? t("correct") : t("incorrect")}
                  </h4>
                  <p
                    className={cn(
                      "mt-0.5 hidden text-xs leading-relaxed font-medium sm:block",
                      isCorrect ? "text-green-700" : "text-rose-700"
                    )}
                  >
                    {isCorrect ? t("correctFeedback") : t("incorrectFeedback")}
                  </p>
                </div>
              </>
            )}
          </div>

          <Button
            size="lg"
            variant={
              answeredState === "showing_result"
                ? isCorrect
                  ? "secondary"
                  : "danger"
                : "primary"
            }
            onClick={handleContinueWithBypass}
            disabled={
              pending || (!selectedOptionId && answeredState === "unanswered")
            }
            className="min-w-[110px] flex-shrink-0 rounded-xl px-5 text-sm font-extrabold uppercase shadow-sm sm:min-w-[150px] sm:rounded-2xl sm:px-8"
          >
            {pending
              ? t("sending")
              : answeredState === "showing_result"
                ? t("continue")
                : t("check")}
          </Button>
        </div>
      </footer>

      <Dialog open={isSkipModalOpen} onOpenChange={setIsSkipModalOpen}>
        <DialogContent
          closeLabel={t("newOnboarding.leaveModalCancel")}
          className="rounded-2xl sm:max-w-md"
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg font-black text-slate-800">
              ⚠️ {t("newOnboarding.leaveModalTitle")}
            </DialogTitle>
            <DialogDescription className="mt-2 text-sm leading-relaxed font-medium text-slate-500">
              {t("newOnboarding.leaveModalDesc")}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4 flex gap-2 sm:flex-row">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setIsSkipModalOpen(false)}
              className="flex-1 rounded-xl font-bold sm:flex-none"
            >
              {t("newOnboarding.leaveModalCancel")}
            </Button>
            <Button
              type="button"
              variant="primary"
              onClick={() => {
                setIsSkipModalOpen(false);
                bypassWarning.current = true;
                handleConfirmLevel("A1");
              }}
              className="flex-1 rounded-xl bg-sky-500 font-bold text-white hover:bg-sky-600 sm:flex-none"
            >
              {t("newOnboarding.leaveModalConfirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
