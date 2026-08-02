import { Edit2, Trash2 } from "lucide-react";

import type { Column } from "@/app/components/data-table";
import { Badge } from "@/app/components/ui/badge";
import { Button } from "@/app/components/ui/button";
import type { LessonChallengeViewModel } from "@/app/features/courses/types/course-management.types";

export function getChallengeColumns({
  onDelete,
  onEdit,
}: {
  onDelete(challenge: LessonChallengeViewModel): void;
  onEdit(challenge: LessonChallengeViewModel): void;
}): Column<LessonChallengeViewModel>[] {
  return [
    {
      className: "w-16",
      header: "ID",
      cell: (challenge) => (
        <span className="text-xs tabular-nums text-muted-foreground">
          #{challenge.id}
        </span>
      ),
    },
    {
      accessorKey: "question",
      header: "Câu hỏi",
      cell: (challenge) => (
        <span className="block max-w-sm truncate font-medium">
          {challenge.question}
        </span>
      ),
    },
    {
      accessorKey: "type",
      header: "Loại",
      cell: (challenge) => (
        <Badge variant={challenge.type === "SELECT" ? "secondary" : "outline"}>
          {challenge.type === "SELECT" ? "SELECT · Trắc nghiệm" : "ASSIST · Hỗ trợ"}
        </Badge>
      ),
    },
    {
      accessorKey: "direction",
      header: "Hướng",
      cell: (challenge) => (
        <span className="text-xs text-muted-foreground">
          {challenge.direction === "EN_TO_VI"
            ? "Anh → Việt"
            : challenge.direction === "VI_TO_EN"
              ? "Việt → Anh"
              : "Không áp dụng"}
        </span>
      ),
    },
    {
      header: "Bài học",
      cell: (challenge) =>
        challenge.lessons?.title ?? `ID: ${challenge.lessonId}`,
    },
    {
      accessorKey: "order",
      className: "w-16 text-center tabular-nums",
      header: "Thứ tự",
    },
    {
      className: "text-right",
      header: "Hành động",
      cell: (challenge) => (
        <div className="flex justify-end gap-1">
          <Button
            aria-label={`Chỉnh sửa câu hỏi ${challenge.id}`}
            onClick={() => onEdit(challenge)}
            size="icon"
            variant="ghost"
          >
            <Edit2 aria-hidden="true" />
          </Button>
          <Button
            aria-label={`Xóa câu hỏi ${challenge.id}`}
            onClick={() => onDelete(challenge)}
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
