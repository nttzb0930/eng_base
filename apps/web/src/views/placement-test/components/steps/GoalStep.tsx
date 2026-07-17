"use client";

import { useTranslations } from "next-intl";
import { cn } from "@/app/utils/cn";

type GoalOption = {
  id: string;
  nameKey: string;
  emoji: string;
};

const GOALS: GoalOption[] = [
  { id: "travel", nameKey: "step3.goalTravel", emoji: "✈️" },
  { id: "career", nameKey: "step3.goalCareer", emoji: "💼" },
  { id: "exams", nameKey: "step3.goalExams", emoji: "🎓" },
  { id: "culture", nameKey: "step3.goalCulture", emoji: "🎬" },
  { id: "study_abroad", nameKey: "step3.goalStudyAbroad", emoji: "🏫" },
  { id: "hobby", nameKey: "step3.goalHobby", emoji: "🎨" },
];

type GoalStepProps = {
  selectedGoals: string[];
  onToggleGoal: (id: string) => void;
  customGoal: string;
  onCustomGoalChange: (value: string) => void;
};

export default function GoalStep({
  selectedGoals,
  onToggleGoal,
  customGoal,
  onCustomGoalChange,
}: GoalStepProps) {
  const t = useTranslations("placementTest");

  return (
    <div className="flex-1 flex flex-col justify-center gap-4">
      {/* 3-column goal grid */}
      <div className="grid grid-cols-3 gap-3">
        {GOALS.map((goal) => {
          const isSelected = selectedGoals.includes(goal.id);
          return (
            <div
              key={goal.id}
              onClick={() => onToggleGoal(goal.id)}
              className={cn(
                "cursor-pointer rounded-2xl border-2 p-4 flex flex-col items-center justify-center gap-2.5 transition-all duration-200 text-center min-h-[100px]",
                isSelected
                  ? "border-sky-500 bg-sky-50/30 shadow-sm"
                  : "border-slate-100 bg-white hover:border-sky-400 hover:shadow-sm"
              )}
            >
              <span className="text-3xl select-none" role="img" aria-label={goal.id}>
                {goal.emoji}
              </span>
              <div className={cn(
                "font-bold text-xs sm:text-sm text-slate-700 leading-tight",
                isSelected && "text-sky-700 font-extrabold"
              )}>
                {t(`newOnboarding.${goal.nameKey}`)}
              </div>
            </div>
          );
        })}
      </div>

      {/* Free-text custom goal */}
      <div className="flex flex-col gap-2">
        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
          {t("newOnboarding.step3.customGoalLabel")}
        </label>
        <textarea
          value={customGoal}
          onChange={(e) => onCustomGoalChange(e.target.value)}
          placeholder={t("newOnboarding.step3.customGoalPlaceholder")}
          rows={3}
          maxLength={300}
          className={cn(
            "w-full resize-none rounded-xl border-2 border-slate-100 bg-white px-4 py-3 text-sm text-slate-700 placeholder:text-slate-400 font-medium",
            "transition-all duration-200 outline-none",
            "focus:border-sky-400 focus:ring-2 focus:ring-sky-100",
            customGoal.trim().length > 0 && "border-sky-300"
          )}
        />
        <div className="text-right text-[10px] text-slate-400 font-semibold">
          {customGoal.length}/300
        </div>
      </div>
    </div>
  );
}
