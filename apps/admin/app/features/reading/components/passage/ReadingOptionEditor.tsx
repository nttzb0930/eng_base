import type { ReadingOptionInput } from "@repo/shared";
import { X } from "lucide-react";

import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { RadioGroupItem } from "@/app/components/ui/radio-group";

type ReadingOptionEditorProps = {
  onChange(option: ReadingOptionInput): void;
  onRemove(): void;
  option: ReadingOptionInput;
  optionIndex: number;
  questionIndex: number;
};

export function ReadingOptionEditor({
  onChange,
  onRemove,
  option,
  optionIndex,
  questionIndex,
}: ReadingOptionEditorProps) {
  const id = `reading-${questionIndex}-${optionIndex}`;
  return (
    <div className="flex items-center gap-3 rounded-md border bg-background p-2">
      <RadioGroupItem
        aria-label={`Đặt đáp án ${optionIndex + 1} là đúng`}
        id={`${id}-correct`}
        value={String(optionIndex)}
      />
      <Input
        aria-label={`Đáp án ${optionIndex + 1} câu ${questionIndex + 1}`}
        onChange={(event) => onChange({ ...option, text: event.target.value })}
        placeholder={`Đáp án ${optionIndex + 1}`}
        value={option.text}
      />
      <Button
        aria-label={`Xóa đáp án ${optionIndex + 1}`}
        onClick={onRemove}
        size="icon"
        type="button"
        variant="ghost"
      >
        <X aria-hidden="true" className="text-destructive" />
      </Button>
    </div>
  );
}
