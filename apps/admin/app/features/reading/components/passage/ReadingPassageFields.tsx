import {
  READING_CEFR_LEVELS,
  type AdminReadingPassage,
  type CreateReadingPassagePayload,
  type ReadingTopicOption,
} from "@repo/shared";

import { FormField } from "@/app/components/forms/FormField";
import { Input } from "@/app/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/components/ui/select";
import { Textarea } from "@/app/components/ui/textarea";

type ReadingPassageFieldsProps = {
  onChange(value: CreateReadingPassagePayload): void;
  passage: AdminReadingPassage | null;
  topics: ReadingTopicOption[];
  value: CreateReadingPassagePayload;
};

export function ReadingPassageFields({
  onChange,
  passage,
  topics,
  value,
}: ReadingPassageFieldsProps) {
  return (
    <div className="space-y-5">
      <div className="grid gap-5 md:grid-cols-2">
        <FormField
          description={passage ? "Slug không thể thay đổi sau khi tạo." : undefined}
          htmlFor="reading-slug"
          label="Slug"
          required
        >
          <Input
            disabled={Boolean(passage)}
            id="reading-slug"
            onChange={(event) => onChange({ ...value, slug: event.target.value })}
            pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
            placeholder="a-day-in-hanoi"
            value={value.slug}
          />
        </FormField>
        <FormField htmlFor="reading-title" label="Tiêu đề" required>
          <Input
            id="reading-title"
            onChange={(event) => onChange({ ...value, title: event.target.value })}
            placeholder="A Day in Hanoi"
            value={value.title}
          />
        </FormField>
        <FormField htmlFor="reading-level" label="CEFR level" required>
          <Select
            onValueChange={(cefrLevel) =>
              onChange({
                ...value,
                cefrLevel: cefrLevel as CreateReadingPassagePayload["cefrLevel"],
              })
            }
            value={value.cefrLevel}
          >
            <SelectTrigger className="w-full" id="reading-level">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {READING_CEFR_LEVELS.map((level) => (
                <SelectItem key={level} value={level}>{level}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormField>
        <FormField htmlFor="reading-topic" label="Topic">
          <Select
            onValueChange={(topicId) =>
              onChange({ ...value, topicId: topicId === "none" ? null : Number(topicId) })
            }
            value={value.topicId === null ? "none" : String(value.topicId)}
          >
            <SelectTrigger className="w-full" id="reading-topic">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Không gán topic</SelectItem>
              {topics.map((topic) => (
                <SelectItem key={topic.id} value={String(topic.id)}>{topic.title}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormField>
        <FormField htmlFor="reading-minutes" label="Thời gian đọc" required>
          <div className="flex max-w-xs items-center gap-3">
            <Input
              className="max-w-32 tabular-nums"
              id="reading-minutes"
              min={1}
              onChange={(event) =>
                onChange({ ...value, estimatedMinutes: Number(event.target.value) })
              }
              type="number"
              value={value.estimatedMinutes}
            />
            <span className="text-sm text-muted-foreground">phút</span>
          </div>
        </FormField>
      </div>
      <FormField htmlFor="reading-body" label="Nội dung passage" required>
        <Textarea
          className="min-h-56 resize-y leading-7"
          id="reading-body"
          onChange={(event) => onChange({ ...value, body: event.target.value })}
          placeholder="Nhập nội dung đọc hiểu..."
          value={value.body}
        />
      </FormField>
    </div>
  );
}
