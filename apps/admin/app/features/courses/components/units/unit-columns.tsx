import { Edit2, Trash2 } from "lucide-react";

import type { Column } from "@/app/components/data-table";
import { Badge } from "@/app/components/ui/badge";
import { Button } from "@/app/components/ui/button";
import type { CourseUnitViewModel } from "@/app/features/courses/types/course-management.types";

export function getUnitColumns({
  onDelete,
  onEdit,
}: {
  onDelete(unit: CourseUnitViewModel): void;
  onEdit(unit: CourseUnitViewModel): void;
}): Column<CourseUnitViewModel>[] {
  return [
    {
      className: "w-16",
      header: "ID",
      cell: (unit) => (
        <span className="text-xs tabular-nums text-muted-foreground">
          #{unit.id}
        </span>
      ),
    },
    {
      accessorKey: "title",
      header: "Tiêu đề chương",
      cell: (unit) => (
        <span className="font-medium text-foreground">{unit.title}</span>
      ),
    },
    {
      header: "Mô tả",
      cell: (unit) => (
        <span className="block max-w-xs truncate text-xs text-muted-foreground">
          {unit.description}
        </span>
      ),
    },
    {
      header: "Khóa học",
      cell: (unit) => (
        <span className="text-sm text-foreground">
          {unit.courses?.title ?? `ID: ${unit.courseId}`}
        </span>
      ),
    },
    {
      className: "w-20 text-center",
      header: "CEFR",
      cell: (unit) => (
        <Badge variant="secondary">{unit.cefrLevel ?? "Chưa gán"}</Badge>
      ),
    },
    {
      accessorKey: "order",
      className: "w-20 text-center tabular-nums",
      header: "Thứ tự",
    },
    {
      className: "text-right",
      header: "Hành động",
      cell: (unit) => (
        <div className="flex justify-end gap-1">
          <Button
            aria-label={`Chỉnh sửa ${unit.title}`}
            onClick={() => onEdit(unit)}
            size="icon"
            variant="ghost"
          >
            <Edit2 aria-hidden="true" />
          </Button>
          <Button
            aria-label={`Xóa ${unit.title}`}
            onClick={() => onDelete(unit)}
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
