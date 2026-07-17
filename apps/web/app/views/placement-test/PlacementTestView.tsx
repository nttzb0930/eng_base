"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import Confetti from "react-confetti";
import { useWindowSize } from "react-use";
import { Volume2, Award, ArrowRight, BookOpen, Compass, CheckCircle2, AlertTriangle, RefreshCw } from "lucide-react";

import { Button } from "@/app/components/ui/button";
import { cn } from "@/app/utils/cn";
import { useLocalizedChallengeQuestion } from "@/app/i18n/use-localized-challenge-question";
import { useCurrentLocale } from "@/app/i18n/use-current-locale";
import { withLocale } from "@/app/i18n/paths";
import { usePlacementTest } from "@/app/features/placement-test/hooks/use-placement-test";
import NewUserOnboarding from "@/app/features/placement-test/onboarding/NewUserOnboarding";
import type { PlacementOnboardingData } from "@/app/features/placement-test/types/placement-test.types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/app/components/ui/dialog";

export function PlacementTestView() {
  const router = useRouter();
  const locale = useCurrentLocale();
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
    isInitialLoading,
    hasInitialError,
  } = usePlacementTest();

  const isFirstQuestion = session?.status === "IN_PROGRESS" && session.questionNumber === 1;
  const [showIntro, setShowIntro] = useState(false);
  const [isSkipModalOpen, setIsSkipModalOpen] = useState(false);
  const bypassWarning = useRef(false);
  const hasInitializedIntro = useRef(false);

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

  useEffect(() => {
    if (!isFirstQuestion || hasInitializedIntro.current) return;
    hasInitializedIntro.current = true;
    setShowIntro(true);
  }, [isFirstQuestion]);

  useEffect(() => {
    if (session?.status !== "CONFIRMED") return;
    bypassWarning.current = true;
    router.replace(withLocale("/learn", locale));
  }, [locale, router, session?.status]);

  const handleConfirmLevelWithBypass = (
    level: string,
    languages?: string[],
    goals?: string[],
    intensity?: string,
    primaryLanguage?: string,
    customGoal?: string,
  ) => {
    bypassWarning.current = true;
    handleConfirmLevel(level, languages, goals, intensity, primaryLanguage, customGoal);
  };

  const handleResetWithBypass = () => {
    bypassWarning.current = true;
    handleReset();
  };

  const handleContinueWithBypass = () => {
    // If completing the test on the 15th question's result screen
    if (questionSession && questionSession.questionNumber >= 15 && answeredState === "showing_result") {
      bypassWarning.current = true;
    }
    handleContinue();
  };

  // 1. Màn hình lỗi nếu không lấy được dữ liệu ban đầu
  if (hasInitialError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4 bg-neutral-50 p-6 text-center">
        <div className="h-16 w-16 bg-rose-100 rounded-full flex items-center justify-center mb-2">
          <AlertTriangle className="h-8 w-8 text-rose-500" />
        </div>
        <h2 className="text-xl font-bold text-neutral-800">{t("errorTitle")}</h2>
        <p className="text-sm text-neutral-500 max-w-sm">
          {t("errorDesc")}
        </p>
        <Button
          onClick={() => window.location.reload()}
          className="mt-2 px-6 rounded-xl bg-green-600 hover:bg-green-700 text-white font-bold"
        >
          {t("retry")}
        </Button>
      </div>
    );
  }

  // 2. Màn hình loading khởi tạo
  if (isInitialLoading || !session || session.status === "CONFIRMED") {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4 bg-neutral-50 text-neutral-600">
        <RefreshCw className="h-10 w-10 animate-spin text-sky-500" />
        <p className="font-semibold text-lg animate-pulse">{t("loading")}</p>
      </div>
    );
  }

  // 2.5 Màn hình chọn điểm bắt đầu (Intro Onboarding)
  if (showIntro && isFirstQuestion) {
    return (
      <NewUserOnboarding
        onComplete={handleConfirmLevelWithBypass}
        onStartTest={() => setShowIntro(false)}
        initialStep={"onboardingStep" in session ? session.onboardingStep : undefined}
        initialData={
          "onboardingData" in session
            ? (session.onboardingData as PlacementOnboardingData | undefined)
            : undefined
        }
      />
    );
  }

  // 2. Màn hình Kết thúc bài test (COMPLETED)
  if (session.status === "COMPLETED") {
    const isBuffer = session.inBufferZone || (session.bufferOptions && session.bufferOptions.length > 0);
    const recommended = session.recommendedLevel;
    const bufferOpts = session.bufferOptions || [];

    return (
      <div className="flex flex-col items-center justify-center min-h-screen px-4 py-8 sm:p-6 relative bg-gradient-to-b from-sky-50 to-white overflow-hidden">
        <Confetti recycle={false} numberOfPieces={350} tweenDuration={8000} width={confettiWidth} height={confettiHeight} />

        <div className="w-full max-w-2xl bg-white border border-slate-200 rounded-2xl sm:rounded-3xl shadow-xl p-5 sm:p-8 lg:p-12 text-center z-10 overflow-y-auto max-h-[90vh]">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 200, damping: 15 }}
          >
            <div className="h-16 w-16 sm:h-20 sm:w-20 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6">
              <Award className="h-9 w-9 sm:h-12 sm:w-12 text-amber-500" />
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-neutral-800 lg:text-4xl mb-3 sm:mb-4">
              {t("congrats")}
            </h1>
            <p className="text-neutral-500 max-w-md mx-auto text-sm sm:text-base mb-6 sm:mb-8">
              {t("description")}
            </p>
          </motion.div>

          {isBuffer ? (
            // Luồng Vùng Đệm (Buffer Zone)
            <div className="mt-4">
              <div className="bg-amber-50 border border-amber-200 text-amber-800 text-sm font-semibold rounded-2xl p-4 flex items-center gap-3 justify-center mb-8 max-w-lg mx-auto">
                <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0" />
                <span>{t("bufferNotice")}</span>
              </div>

              <h3 className="text-lg font-bold text-neutral-700 mb-4">{t("chooseLevel")}</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-lg mx-auto mb-8">
                {bufferOpts.map((lvl: string, idx: number) => {
                  const isHigher = idx === 1;
                  return (
                    <motion.div
                      key={lvl}
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleConfirmLevelWithBypass(lvl)}
                      className={cn(
                        "cursor-pointer rounded-2xl border-2 border-b-4 p-5 text-left flex flex-col justify-between transition-colors",
                        isHigher
                           ? "border-sky-200 bg-sky-50/50 hover:bg-sky-50 active:border-b-2"
                           : "border-green-200 bg-green-50/50 hover:bg-green-50 active:border-b-2"
                      )}
                    >
                      <div>
                        <span className={cn(
                          "px-3 py-1 text-xs font-bold rounded-full uppercase tracking-wider",
                          isHigher ? "bg-sky-100 text-sky-700" : "bg-green-100 text-green-700"
                        )}>
                          {t("level", { level: lvl })}
                        </span>
                        <h4 className="text-base font-extrabold text-neutral-800 mt-3">
                          {isHigher ? t("challenge", { level: lvl }) : t("reviewOption", { level: lvl })}
                        </h4>
                        <p className="text-xs text-neutral-500 mt-2">
                          {isHigher ? t("challengeDesc") : t("reviewDesc")}
                        </p>
                      </div>
                      <div className="flex justify-end mt-4">
                        <ArrowRight className={cn("h-5 w-5", isHigher ? "text-sky-500" : "text-green-500")} />
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
              <div className="inline-block bg-sky-100 text-sky-800 text-2xl sm:text-3xl font-black rounded-2xl sm:rounded-3xl px-6 sm:px-8 py-3 sm:py-4 mb-4 sm:mb-6 shadow-sm">
                {recommended}
              </div>

              <div className="bg-sky-50/50 border border-sky-100 rounded-xl sm:rounded-2xl p-3 sm:p-4 max-w-md mx-auto mb-6 sm:mb-8 flex items-start gap-3 text-left">
                <BookOpen className="h-5 w-5 sm:h-6 sm:w-6 text-sky-500 flex-shrink-0 mt-0.5" />
                <span className="text-xs sm:text-sm text-sky-900 font-semibold leading-relaxed">
                  {t("levelRecommendation", {
                    unit: recommended === "A1" ? 1 : recommended === "A2" ? 2 : recommended === "B1" ? 3 : 4,
                    level: recommended
                  })}
                </span>
              </div>

              <Button
                size="lg"
                variant="primary"
                onClick={() => handleConfirmLevelWithBypass(recommended)}
                disabled={pending}
                className="w-full max-w-sm rounded-xl sm:rounded-2xl text-sm sm:text-base h-11 sm:h-12 shadow-md"
              >
                {pending ? t("sending") : t("startLearning")}
              </Button>
            </div>
          )}

          <div className="mt-8 flex justify-center">
            <button
              onClick={handleResetWithBypass}
              disabled={pending}
              className="text-xs text-rose-500 hover:text-rose-600 hover:underline flex items-center gap-1 font-semibold uppercase tracking-wider"
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
    <div className="flex flex-col min-h-screen">
      {correctAudio}
      {incorrectAudio}

      {/* Header */}
      <header className="px-6 py-4 flex items-center justify-between border-b border-slate-200 bg-white sticky top-0 z-20">
        <button
          onClick={() => setIsSkipModalOpen(true)}
          className="text-neutral-400 hover:text-neutral-600 p-2 transition"
          title={t("exitTitle")}
        >
          <Compass className="h-6 w-6" />
        </button>

        {/* Progress bar */}
        <div className="flex-1 mx-6 max-w-xl relative">
          <div className="w-full bg-slate-100 rounded-full h-3 border border-slate-200">
            <motion.div
              className="bg-sky-400 h-full rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${progressPercent}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
          <span className="absolute right-0 top-4 text-xs font-bold text-neutral-400">
            {t("questionProgress", { questionNumber })}
          </span>
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsSkipModalOpen(true)}
          className="text-neutral-500 text-xs font-bold uppercase tracking-wider"
        >
          {t("skipTest")}
        </Button>
      </header>

      {/* Content Area */}
      <main className="flex-1 flex items-start sm:items-center justify-center p-3 sm:p-6 bg-slate-50 overflow-y-auto">
        <div className="w-full max-w-xl bg-white border border-slate-200 rounded-2xl sm:rounded-3xl shadow-sm p-4 sm:p-6 lg:p-10 flex flex-col gap-4 sm:gap-6 my-3 sm:my-0 lg:min-h-[420px]">

          <div className="flex items-start justify-between gap-3 sm:gap-4">
            <h2 className="text-base sm:text-xl lg:text-2xl font-black text-neutral-800 leading-tight">
              {localizedQuestion}
            </h2>

            {challenge.audioUrl && (
              <button
                onClick={playQuestionAudio}
                className="p-3 bg-sky-50 hover:bg-sky-100 text-sky-500 hover:text-sky-600 rounded-2xl transition border border-sky-100 shadow-sm flex-shrink-0"
                title={t("listenPronunciation")}
              >
                <Volume2 className="h-6 w-6" />
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 gap-3 mt-4">
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
                    whileHover={answeredState !== "unanswered" ? {} : { scale: 1.015 }}
                    whileTap={answeredState !== "unanswered" ? {} : { scale: 0.985 }}
                    transition={{ type: "spring", stiffness: 450, damping: 18 }}
                    className={cn(
                      "cursor-pointer rounded-2xl border-2 border-b-4 p-4 lg:p-5 flex items-center justify-between transition-all",
                      isSelected && "border-sky-300 bg-sky-50/50 hover:bg-sky-50/50",
                      cardStatus === "correct" && "border-green-300 bg-green-50/50 hover:bg-green-50/50",
                      cardStatus === "wrong" && "border-rose-300 bg-rose-50/50 hover:bg-rose-50/50",
                      answeredState !== "unanswered" && !isSelected && cardStatus !== "correct" && "opacity-50 pointer-events-none"
                    )}
                  >
                    <p className={cn(
                      "text-sm font-semibold lg:text-base text-neutral-700",
                      isSelected && "text-sky-600 font-bold",
                      cardStatus === "correct" && "text-green-700 font-bold",
                      cardStatus === "wrong" && "text-rose-700 font-bold"
                    )}>
                      {opt.text}
                    </p>

                    {/* Badge phím tắt */}
                    <div className={cn(
                      "flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 text-xs font-extrabold text-neutral-400 shadow-sm bg-slate-50",
                      isSelected && "border-sky-300 text-sky-500 bg-white",
                      cardStatus === "correct" && "border-green-500 text-green-600 bg-white",
                      cardStatus === "wrong" && "border-rose-500 text-rose-600 bg-white"
                    )}>
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
      <footer className={cn(
        "px-4 sm:px-6 py-3 sm:py-5 border-t border-slate-200 bg-white z-10 transition-colors duration-200 flex items-center justify-between",
        answeredState === "showing_result" && isCorrect && "bg-green-50 border-green-200",
        answeredState === "showing_result" && !isCorrect && "bg-rose-50 border-rose-200"
      )}>
        <div className="flex-1 max-w-xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            {answeredState === "showing_result" && (
              <>
                <div className={cn(
                  "h-8 w-8 sm:h-10 sm:w-10 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm",
                  isCorrect ? "bg-green-500 text-white" : "bg-rose-500 text-white"
                )}>
                  {isCorrect
                    ? <CheckCircle2 className="h-5 w-5 sm:h-6 sm:w-6" />
                    : <AlertTriangle className="h-5 w-5 sm:h-6 sm:w-6" />
                  }
                </div>
                <div className="min-w-0">
                  <h4 className={cn(
                    "text-xs sm:text-sm font-black uppercase tracking-wide",
                    isCorrect ? "text-green-800" : "text-rose-800"
                  )}>
                    {isCorrect ? t("correct") : t("incorrect")}
                  </h4>
                  <p className={cn(
                    "text-xs leading-relaxed mt-0.5 font-medium hidden sm:block",
                    isCorrect ? "text-green-700" : "text-rose-700"
                  )}>
                    {isCorrect
                      ? t("correctFeedback")
                      : t("incorrectFeedback")}
                  </p>
                </div>
              </>
            )}
          </div>

          <Button
            size="lg"
            variant={answeredState === "showing_result" ? (isCorrect ? "secondary" : "danger") : "primary"}
            onClick={handleContinueWithBypass}
            disabled={pending || (!selectedOptionId && answeredState === "unanswered")}
            className="px-5 sm:px-8 min-w-[110px] sm:min-w-[150px] rounded-xl sm:rounded-2xl text-sm font-extrabold uppercase shadow-sm flex-shrink-0"
          >
            {pending
              ? t("sending")
              : answeredState === "showing_result"
                ? t("continue")
                : t("check")
            }
          </Button>
        </div>
      </footer>

      <Dialog open={isSkipModalOpen} onOpenChange={setIsSkipModalOpen}>
        <DialogContent closeLabel={t("newOnboarding.leaveModalCancel")} className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-black text-slate-800 flex items-center gap-2">
              ⚠️ {t("newOnboarding.leaveModalTitle")}
            </DialogTitle>
            <DialogDescription className="text-sm text-slate-500 font-medium leading-relaxed mt-2">
              {t("newOnboarding.leaveModalDesc")}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex sm:flex-row gap-2 mt-4">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setIsSkipModalOpen(false)}
              className="flex-1 sm:flex-none font-bold rounded-xl"
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
              className="flex-1 sm:flex-none font-bold bg-sky-500 hover:bg-sky-600 text-white rounded-xl"
            >
              {t("newOnboarding.leaveModalConfirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
