import type { ReadingQuestionInput } from "@repo/shared";
import { Plus, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { RadioGroup } from "@/app/components/ui/radio-group";

import { ReadingOptionEditor } from "./ReadingOptionEditor";

type ReadingQuestionEditorProps = {
  onChange(question: ReadingQuestionInput): void;
  onRemove(): void;
  question: ReadingQuestionInput;
  questionIndex: number;
};

export function ReadingQuestionEditor({
  onChange,
  onRemove,
  question,
  questionIndex,
}: ReadingQuestionEditorProps) {
  const removeOption = (optionIndex: number) => {
    if (question.options.length <= 2) {
      toast.error("Mỗi câu hỏi cần ít nhất hai đáp án.");
      return;
    }
    const options = question.options.filter((_, index) => index !== optionIndex);
    if (!options.some((option) => option.correct)) {
      options[0] = { ...options[0], correct: true };
    }
    onChange({ ...question, options });
  };

  return (
    <fieldset className="space-y-4 rounded-lg border bg-muted/30 p-4">
      <legend className="px-1 text-sm font-medium">Câu {questionIndex + 1}</legend>
      <div className="flex gap-2">
        <Input
          aria-label={`Nội dung câu hỏi ${questionIndex + 1}`}
          onChange={(event) => onChange({ ...question, prompt: event.target.value })}
          placeholder="Nhập câu hỏi..."
          value={question.prompt}
        />
        <Button
          aria-label={`Xóa câu hỏi ${questionIndex + 1}`}
          onClick={onRemove}
          size="icon"
          type="button"
          variant="ghost"
        >
          <X aria-hidden="true" className="text-destructive" />
        </Button>
      </div>
      <RadioGroup
        onValueChange={(selected) =>
          onChange({
            ...question,
            options: question.options.map((option, index) => ({
              ...option,
              correct: index === Number(selected),
            })),
          })
        }
        value={String(Math.max(0, question.options.findIndex((option) => option.correct)))}
      >
        {question.options.map((option, optionIndex) => (
          <ReadingOptionEditor
            key={optionIndex}
            onChange={(nextOption) =>
              onChange({
                ...question,
                options: question.options.map((current, index) =>
                  index === optionIndex ? nextOption : current,
                ),
              })
            }
            onRemove={() => removeOption(optionIndex)}
            option={option}
            optionIndex={optionIndex}
            questionIndex={questionIndex}
          />
        ))}
      </RadioGroup>
      <Button
        onClick={() =>
          onChange({
            ...question,
            options: [
              ...question.options,
              { correct: false, order: question.options.length + 1, text: "" },
            ],
          })
        }
        size="sm"
        type="button"
        variant="ghost"
      >
        <Plus aria-hidden="true" /> Thêm đáp án
      </Button>
    </fieldset>
  );
}
