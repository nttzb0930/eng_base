import { CheckCircle2, Edit2, Trash2, Volume2, XCircle } from "lucide-react";
import Image from "next/image";

import type { Column } from "@/app/components/data-table";
import { Badge } from "@/app/components/ui/badge";
import { Button } from "@/app/components/ui/button";
import type { LessonChallengeOptionViewModel } from "@/app/features/courses/types/course-management.types";

type ChallengeOptionColumnActions = {
  onDelete(option: LessonChallengeOptionViewModel): void;
  onEdit(option: LessonChallengeOptionViewModel): void;
  onPlayAudio(url: string): void;
  playingAudioUrl: string | null;
};

export function getChallengeOptionColumns({
  onDelete,
  onEdit,
  onPlayAudio,
  playingAudioUrl,
}: ChallengeOptionColumnActions): Column<LessonChallengeOptionViewModel>[] {
  return [
    {
      className: "w-16",
      header: "ID",
      cell: (option) => (
        <span className="text-xs tabular-nums text-muted-foreground">
          #{option.id}
        </span>
      ),
    },
    {
      accessorKey: "text",
      header: "Nội dung đáp án",
      cell: (option) => <span className="font-medium">{option.text}</span>,
    },
    {
      accessorKey: "correct",
      header: "Phân loại",
      cell: (option) => (
        <Badge variant={option.correct ? "secondary" : "outline"}>
          {option.correct ? (
            <CheckCircle2 aria-hidden="true" />
          ) : (
            <XCircle aria-hidden="true" />
          )}
          {option.correct ? "Đáp án đúng" : "Đáp án nhiễu"}
        </Badge>
      ),
    },
    {
      header: "Ảnh / Audio",
      cell: (option) => (
        <div className="flex items-center gap-2">
          {option.imageSrc ? (
            <Image
              alt=""
              className="size-8 rounded-md border object-contain p-0.5"
              height={32}
              src={option.imageSrc}
              width={32}
            />
          ) : null}
          {option.audioSrc ? (
            <Button
              aria-label={`Phát audio đáp án ${option.id}`}
              onClick={() => onPlayAudio(option.audioSrc as string)}
              size="icon"
              variant="ghost"
            >
              <Volume2
                aria-hidden="true"
                className={
                  playingAudioUrl === option.audioSrc
                    ? "animate-pulse text-primary"
                    : undefined
                }
              />
            </Button>
          ) : null}
          {!option.imageSrc && !option.audioSrc ? (
            <span className="text-xs text-muted-foreground">Không có</span>
          ) : null}
        </div>
      ),
    },
    {
      header: "Câu hỏi",
      cell: (option) => (
        <span className="block max-w-xs truncate">
          {option.challenges?.question ?? `ID: ${option.challengeId}`}
        </span>
      ),
    },
    {
      className: "text-right",
      header: "Hành động",
      cell: (option) => (
        <div className="flex justify-end gap-1">
          <Button
            aria-label={`Chỉnh sửa đáp án ${option.id}`}
            onClick={() => onEdit(option)}
            size="icon"
            variant="ghost"
          >
            <Edit2 aria-hidden="true" />
          </Button>
          <Button
            aria-label={`Xóa đáp án ${option.id}`}
            onClick={() => onDelete(option)}
            size="icon"
            variant="ghost"
          >
            <Trash2 aria-hidden="true" className="text-destructive" />
          </Button>
        </div>
      ),
    },
  ];
}
