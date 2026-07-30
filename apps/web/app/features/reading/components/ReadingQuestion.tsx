"use client";

import type { ReadingLearnerQuestion } from "@repo/shared";

import { cn } from "@/app/utils/cn";

type ReadingQuestionProps = {
  question: ReadingLearnerQuestion;
  index: number;
  selectedOptionId?: number;
  onSelect: (optionId: number) => void;
};

export function ReadingQuestion({
  question,
  index,
  selectedOptionId,
  onSelect,
}: ReadingQuestionProps) {
  return (
    <fieldset className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
      <legend className="px-2 text-sm font-bold text-sky-600">
        {index + 1}
      </legend>
      <p className="mb-5 text-base font-semibold leading-7 text-slate-900">
        {question.prompt}
      </p>
      <div className="grid gap-3">
        {question.options.map((option) => {
          const selected = selectedOptionId === option.id;
          return (
            <label
              key={option.id}
              className={cn(
                "flex cursor-pointer items-start gap-3 rounded-xl border p-4 text-sm leading-6 transition-colors focus-within:ring-2 focus-within:ring-sky-500 focus-within:ring-offset-2",
                selected
                  ? "border-sky-500 bg-sky-50 text-sky-950"
                  : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
              )}
            >
              <input
                type="radio"
                name={`reading-question-${question.id}`}
                value={option.id}
                checked={selected}
                onChange={() => onSelect(option.id)}
                className="mt-1 h-4 w-4 accent-sky-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
              />
              <span>{option.text}</span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
