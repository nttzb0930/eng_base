"use client";

import { useTranslations } from "next-intl";
import { Sprout, Zap, Rocket, Trophy, Check, BookOpen, Clock } from "lucide-react";
import { cn } from "@/app/utils/cn";

type IntensityOption = {
  id: string;
  nameKey: string;
  descKey: string;
  wordsVal: number;
  timeVal: number;
  isRecommended?: boolean;
};

const INTENSITIES: IntensityOption[] = [
  { id: "relaxed", nameKey: "step4.relaxedTitle", descKey: "step4.relaxedDesc", wordsVal: 5, timeVal: 10 },
  { id: "standard", nameKey: "step4.standardTitle", descKey: "step4.standardDesc", wordsVal: 15, timeVal: 25, isRecommended: true },
  { id: "accelerated", nameKey: "step4.acceleratedTitle", descKey: "step4.acceleratedDesc", wordsVal: 30, timeVal: 50 },
  { id: "intensive", nameKey: "step4.intensiveTitle", descKey: "step4.intensiveDesc", wordsVal: 50, timeVal: 80 },
];

const ICON_MAP = {
  relaxed: Sprout,
  standard: Zap,
  accelerated: Rocket,
  intensive: Trophy,
};

const ICON_COLOR_MAP = {
  relaxed: "text-emerald-500 fill-emerald-50/50",
  standard: "text-amber-500 fill-amber-50/50",
  accelerated: "text-rose-500 fill-rose-50/50",
  intensive: "text-yellow-600 fill-yellow-50/50",
};

type IntensityStepProps = {
  selectedIntensity: string;
  onSelectIntensity: (id: string) => void;
};

export default function IntensityStep({ selectedIntensity, onSelectIntensity }: IntensityStepProps) {
  const t = useTranslations("placementTest");

  return (
    <div className="flex-grow flex flex-col justify-center min-h-0">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-2 w-full">
        {INTENSITIES.map((intensity) => {
          const isSelected = selectedIntensity === intensity.id;
          const IconComponent = ICON_MAP[intensity.id as keyof typeof ICON_MAP];
          const iconColorClass = ICON_COLOR_MAP[intensity.id as keyof typeof ICON_COLOR_MAP];

          return (
            <div
              key={intensity.id}
              onClick={() => onSelectIntensity(intensity.id)}
              className={cn(
                "group relative cursor-pointer rounded-2xl border-2 p-5 flex items-center justify-between transition-all duration-200",
                isSelected
                  ? "border-sky-500 bg-sky-50/30 shadow-sm"
                  : "border-slate-100 bg-white hover:border-sky-400 hover:shadow-sm"
              )}
            >
              {intensity.isRecommended && (
                <span className="absolute -top-2.5 right-6 px-2.5 py-0.5 bg-emerald-500 text-white rounded-md text-[10px] font-bold uppercase tracking-wider shadow-sm border border-emerald-500">
                  {t("newOnboarding.step4.recommended")}
                </span>
              )}

              <div className="flex items-center gap-4">
                {IconComponent && (
                  <IconComponent className={cn("h-10 w-10 flex-shrink-0", iconColorClass)} strokeWidth={1.5} />
                )}
                <div>
                  <h4 className="text-base font-extrabold text-slate-900 tracking-tight">
                    {t(`newOnboarding.${intensity.nameKey}`)}
                  </h4>
                  <p className="text-sm text-slate-500 font-medium mt-0.5 leading-relaxed">
                    {t(`newOnboarding.${intensity.descKey}`)}
                  </p>
                  <div className="flex items-center gap-3 mt-2">
                    <span className="text-[10px] font-extrabold px-2.5 py-1 rounded-lg bg-slate-50 text-slate-600 border border-slate-100 flex items-center gap-1">
                      <BookOpen className="h-3.5 w-3.5 text-slate-400" />
                      {t("newOnboarding.step4.words", { count: intensity.wordsVal })}
                    </span>
                    <span className="text-[10px] font-extrabold px-2.5 py-1 rounded-lg bg-slate-50 text-slate-600 border border-slate-100 flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5 text-slate-400" />
                      {t("newOnboarding.step4.time", { count: intensity.timeVal })}
                    </span>
                  </div>
                </div>
              </div>

              {isSelected ? (
                <div className="h-6 w-6 rounded-full border-2 border-sky-500 bg-sky-50 flex items-center justify-center flex-shrink-0 transition-all duration-200">
                  <Check className="h-3.5 w-3.5 text-sky-500 stroke-[3]" />
                </div>
              ) : (
                <div className="h-6 w-6 rounded-full border-2 border-slate-200 bg-slate-50/50 flex-shrink-0 transition-all duration-200 group-hover:border-sky-400" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
