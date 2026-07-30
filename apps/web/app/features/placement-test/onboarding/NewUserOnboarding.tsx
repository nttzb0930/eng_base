"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { LogOut } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import type {
  LearningIntensityId,
  OnboardingGoalId,
  TargetLanguageId,
} from "@repo/shared";
import { Button } from "@/app/components/ui/button";
import { useAuth } from "@/app/features/auth/hooks/use-auth";
import type { Locale } from "@/app/i18n/config";
import {
  buildLocalePreferencePath,
  getBrowserLocaleStorage,
  writeLocalePreference,
} from "@/app/i18n/locale-preference";
import { useCurrentLocale } from "@/app/i18n/use-current-locale";
import { cn } from "@/app/utils/cn";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/app/components/ui/dialog";

import { useUpdatePlacementOnboarding } from "../hooks/use-placement-test";
import type { PlacementOnboardingData } from "../types/placement-test.types";
import LanguageStep from "./LanguageStep";
import LevelStep from "./LevelStep";
import GoalStep from "./GoalStep";
import IntensityStep from "./IntensityStep";
import {
  getOnboardingStepMessageKey,
  ONBOARDING_FLOW_VERSION,
  ONBOARDING_TOTAL_STEPS,
  resolveInitialOnboardingStep,
} from "./onboarding-flow";
import SystemLanguageStep from "./SystemLanguageStep";

type NewUserOnboardingProps = {
  onComplete: (
    level: string,
    languages?: TargetLanguageId[],
    goals?: OnboardingGoalId[],
    intensity?: LearningIntensityId,
    primaryLanguage?: TargetLanguageId,
    customGoal?: string,
  ) => void;
  onStartTest: () => void;
  initialStep?: number;
  initialData?: PlacementOnboardingData;
};

export default function NewUserOnboarding({
  onComplete,
  onStartTest,
  initialStep,
  initialData,
}: NewUserOnboardingProps) {
  const { logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const locale = useCurrentLocale();
  const updateOnboarding = useUpdatePlacementOnboarding();
  const t = useTranslations("placementTest");
  const [step, setStep] = useState(() =>
    resolveInitialOnboardingStep(initialStep, initialData),
  );
  const [selectedLangs, setSelectedLangs] = useState<TargetLanguageId[]>(initialData?.selectedLangs || []);
  const [primaryLang, setPrimaryLang] = useState<TargetLanguageId | null>(initialData?.primaryLang || null);
  const [selectedLevels, setSelectedLevels] = useState<Partial<Record<TargetLanguageId, string>>>(initialData?.selectedLevels || {});
  const [selectedGoals, setSelectedGoals] = useState<OnboardingGoalId[]>(initialData?.selectedGoals || []);
  const [customGoal, setCustomGoal] = useState<string>(initialData?.customGoal || "");
  const [selectedIntensity, setSelectedIntensity] = useState<LearningIntensityId>(initialData?.selectedIntensity || "standard");
  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);
  const bypassWarning = useRef(false);

  const saveOnboardingState = async (nextStep: number) => {
    try {
      const dataToSave = {
        flowVersion: ONBOARDING_FLOW_VERSION,
        selectedLangs,
        primaryLang,
        selectedLevels,
        selectedGoals,
        customGoal,
        selectedIntensity,
      };
      await updateOnboarding.mutateAsync({ step: nextStep, data: dataToSave });
    } catch (error) {
      console.error("Failed to save onboarding state to DB:", error);
    }
  };

  const progressPercent = (step / ONBOARDING_TOTAL_STEPS) * 100;

  // Warn user before reloading or leaving the page
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

  const handleNext = () => {
    if (step === 2 && selectedLangs.length === 0) return;

    if (step < ONBOARDING_TOTAL_STEPS) {
      const nextStep = step + 1;
      setStep(nextStep);
      void saveOnboardingState(nextStep);
    } else {
      // Map C1/C2 to B2 as DB only supports up to B2
      const primaryLevel = primaryLang ? (selectedLevels[primaryLang] || "A1") : "A1";
      const mappedLevel = ["C1", "C2"].includes(primaryLevel) ? "B2" : primaryLevel;
      
      // Save options to localStorage as a fallback
      try {
        localStorage.setItem("user_onboarding_langs", JSON.stringify(selectedLangs));
        localStorage.setItem("user_onboarding_goals", JSON.stringify(selectedGoals));
        if (customGoal.trim()) {
          localStorage.setItem("user_onboarding_custom_goal", customGoal.trim());
        }
        localStorage.setItem("user_onboarding_intensity", selectedIntensity);
        localStorage.setItem("user_onboarding_levels", JSON.stringify(selectedLevels));
        if (primaryLang) {
          localStorage.setItem("user_onboarding_primary_lang", primaryLang);
        }
      } catch (e) {
        console.error("Local storage error:", e);
      }

      bypassWarning.current = true;
      onComplete(
        mappedLevel,
        selectedLangs,
        selectedGoals,
        selectedIntensity,
        primaryLang || undefined,
        customGoal.trim() || undefined
      );
    }
  };

  const handleBack = () => {
    if (step > 1) {
      const prevStep = step - 1;
      setStep(prevStep);
      void saveOnboardingState(prevStep);
    }
  };

  const handleToggleLang = (id: TargetLanguageId) => {
    const isSelected = selectedLangs.includes(id);
    let updatedLangs: TargetLanguageId[];
    if (isSelected) {
      updatedLangs = selectedLangs.filter((lang) => lang !== id);
    } else {
      updatedLangs = [...selectedLangs, id];
    }
    setSelectedLangs(updatedLangs);

    // Automatically update primaryLang
    if (updatedLangs.length === 0) {
      setPrimaryLang(null);
    } else if (updatedLangs.length === 1) {
      setPrimaryLang(updatedLangs[0]);
    } else {
      if (isSelected && primaryLang === id) {
        setPrimaryLang(updatedLangs[0]);
      }
    }

    // Automatically update selectedLevels
    setSelectedLevels((prevLevels) => {
      const nextLevels = { ...prevLevels };
      if (isSelected) {
        delete nextLevels[id];
      } else {
        if (id === "ja") nextLevels[id] = "N5";
        else if (id === "zh") nextLevels[id] = "HSK 1";
        else if (id === "ko") nextLevels[id] = "TOPIK 1";
        else nextLevels[id] = "A1";
      }
      return nextLevels;
    });
  };

  const handleSelectSystemLocale = (nextLocale: Locale) => {
    writeLocalePreference(getBrowserLocaleStorage(), nextLocale);
    if (nextLocale === locale) return;

    router.replace(
      buildLocalePreferencePath(
        pathname,
        window.location.search,
        window.location.hash,
        nextLocale,
      ),
    );
  };

  const handleSetPrimary = (id: TargetLanguageId) => {
    if (selectedLangs.includes(id)) {
      setPrimaryLang(id);
    }
  };

  const handleToggleGoal = (id: OnboardingGoalId) => {
    if (selectedGoals.includes(id)) {
      setSelectedGoals((prev) => prev.filter((g) => g !== id));
    } else {
      setSelectedGoals((prev) => [...prev, id]);
    }
  };

  const handleLogout = () => {
    bypassWarning.current = true;
    void logout().finally(() => window.location.replace("/"));
  };

  const handleStartTest = () => {
    bypassWarning.current = true;
    onStartTest();
  };

  // Variants for Framer Motion sliding transition
  const stepVariants = {
    initial: { opacity: 0, x: 20 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -20 },
  };

  const isNextDisabled = step === 2 && selectedLangs.length === 0;
  const stepMessageKey = getOnboardingStepMessageKey(step);

  return (
    <div className="flex flex-col h-screen bg-slate-50/50 text-slate-800 w-full overflow-hidden">
      {/* Main Container */}
      <main className="flex-1 flex items-center justify-center p-4 md:p-8 w-full min-h-0">
        <div className="w-full max-w-3xl bg-white border border-slate-200 rounded-3xl shadow-sm p-6 md:p-10 flex flex-col gap-6" style={{ maxHeight: '90vh' }}>
          
          {/* Card Onboarding Header */}
          <div>
            <span className="text-[10px] font-black text-sky-600 uppercase tracking-widest mb-1.5 block">
              {t("newOnboarding.stepProgress", { step })}
            </span>
            <div className="flex items-start justify-between gap-4 w-full">
              <h2 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight leading-tight">
                {t(`newOnboarding.${stepMessageKey}.title`)}
              </h2>
              <button
                onClick={handleLogout}
                className="flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-slate-600 uppercase tracking-wider transition flex-shrink-0 pt-1.5 active:translate-y-px"
              >
                <span>{t("newOnboarding.logout")}</span>
                <LogOut className="h-3.5 w-3.5" />
              </button>
            </div>
            <p className="text-sm text-slate-500 font-medium mt-2 leading-relaxed">
              {t(`newOnboarding.${stepMessageKey}.desc`)}
            </p>

            {/* Custom Progress Bar */}
            <div className="w-full bg-slate-100 rounded-full h-1.5 mt-5 mb-1 overflow-hidden">
              <motion.div
                className="bg-sky-500 h-full rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${progressPercent}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              variants={stepVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={{ duration: 0.2 }}
              className="flex-1 flex flex-col min-h-0 overflow-y-auto pr-1"
            >
              {step === 1 && (
                <SystemLanguageStep
                  selectedLocale={locale}
                  onSelectLocale={handleSelectSystemLocale}
                />
              )}

              {step === 2 && (
                <LanguageStep
                  selectedLangs={selectedLangs}
                  onToggleLang={handleToggleLang}
                  primaryLang={primaryLang}
                  onSetPrimary={handleSetPrimary}
                />
              )}

              {step === 3 && (
                <LevelStep
                  selectedLangs={selectedLangs}
                  selectedLevels={selectedLevels}
                  onSelectLevel={(lang, lvl) => {
                    setSelectedLevels((prev) => ({ ...prev, [lang]: lvl }));
                  }}
                  onStartTest={handleStartTest}
                />
              )}

              {step === 4 && (
                <GoalStep
                  selectedGoals={selectedGoals}
                  onToggleGoal={handleToggleGoal}
                  customGoal={customGoal}
                  onCustomGoalChange={setCustomGoal}
                />
              )}

              {step === 5 && (
                <IntensityStep
                  selectedIntensity={selectedIntensity}
                  onSelectIntensity={setSelectedIntensity}
                />
              )}
            </motion.div>
          </AnimatePresence>

          {/* Navigation Action Buttons */}
          <div className="pt-6 border-t border-slate-100 flex items-center justify-between gap-4">
            <button
              onClick={handleBack}
              disabled={step === 1}
              className={cn(
                "px-5 py-2 text-sm font-bold text-slate-400 hover:text-slate-700 transition active:translate-y-px",
                step === 1 && "opacity-0 pointer-events-none"
              )}
            >
              ← {t("newOnboarding.back")}
            </button>

            <Button
              size="lg"
              onClick={handleNext}
              disabled={isNextDisabled}
              className={cn(
                "px-8 min-w-[150px] rounded-xl text-sm font-extrabold uppercase shadow-sm flex-shrink-0 flex items-center gap-1.5 justify-center transition-all active:translate-y-px",
                isNextDisabled
                  ? "bg-slate-200 text-slate-400 cursor-not-allowed border-none shadow-none"
                  : "bg-sky-500 hover:bg-sky-600 text-white"
              )}
            >
              <span>
                {step === ONBOARDING_TOTAL_STEPS
                  ? t("newOnboarding.step4.startCTA") 
                  : `${t("newOnboarding.step4.nextCTA")} →`
                }
              </span>
            </Button>
          </div>

        </div>
      </main>

      <Dialog open={isLeaveModalOpen} onOpenChange={setIsLeaveModalOpen}>
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
              onClick={() => setIsLeaveModalOpen(false)}
              className="flex-1 sm:flex-none font-bold rounded-xl"
            >
              {t("newOnboarding.leaveModalCancel")}
            </Button>
            <Button
              type="button"
              variant="primary"
              onClick={() => {
                setIsLeaveModalOpen(false);
                bypassWarning.current = true;
                const finalLangs: TargetLanguageId[] =
                  selectedLangs.length > 0 ? selectedLangs : ["en"];
                const finalPrimary = primaryLang || finalLangs[0];
                onComplete(
                  "A1",
                  finalLangs,
                  selectedGoals,
                  selectedIntensity,
                  finalPrimary,
                  customGoal.trim() || undefined
                );
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
