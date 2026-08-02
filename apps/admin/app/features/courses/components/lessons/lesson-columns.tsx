import { Edit2, Trash2 } from "lucide-react";

import type { Column } from "@/app/components/data-table";
import { Button } from "@/app/components/ui/button";
import type { CourseLessonViewModel } from "@/app/features/courses/types/course-management.types";

export function getLessonColumns({
  onDelete,
  onEdit,
}: {
  onDelete(lesson: CourseLessonViewModel): void;
  onEdit(lesson: CourseLessonViewModel): void;
}): Column<CourseLessonViewModel>[] {
  return [
    {
      className: "w-16",
      header: "ID",
      cell: (lesson) => (
        <span className="text-xs tabular-nums text-muted-foreground">
          #{lesson.id}
        </span>
      ),
    },
    {
      accessorKey: "title",
      header: "Tiêu đề bài học",
      cell: (lesson) => (
        <span className="font-medium text-foreground">{lesson.title}</span>
      ),
    },
    {
      header: "Chương học",
      cell: (lesson) => lesson.units?.title ?? `ID: ${lesson.unitId}`,
    },
    {
      accessorKey: "order",
      className: "w-20 text-center tabular-nums",
      header: "Thứ tự",
    },
    {
      className: "text-right",
      header: "Hành động",
      cell: (lesson) => (
        <div className="flex justify-end gap-1">
          <Button
            aria-label={`Chỉnh sửa ${lesson.title}`}
            onClick={() => onEdit(lesson)}
            size="icon"
            variant="ghost"
          >
            <Edit2 aria-hidden="true" />
          </Button>
          <Button
            aria-label={`Xóa ${lesson.title}`}
            onClick={() => onDelete(lesson)}
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
