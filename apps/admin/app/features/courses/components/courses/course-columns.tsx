import { Edit2, Trash2 } from "lucide-react";

import type { Column } from "@/app/components/data-table";
import { Button } from "@/app/components/ui/button";
import type { CourseViewModel } from "@/app/features/courses/types/course-management.types";

export function getCourseColumns({
  onDelete,
  onEdit,
}: {
  onDelete(course: CourseViewModel): void;
  onEdit(course: CourseViewModel): void;
}): Column<CourseViewModel>[] {
  return [
    {
      accessorKey: "id",
      className: "w-16",
      header: "ID",
      cell: (course) => (
        <span className="text-xs font-normal tabular-nums text-muted-foreground">
          #{course.id}
        </span>
      ),
    },
    {
      accessorKey: "code",
      header: "Mã khóa học",
      cell: (course) => (
        <span className="font-mono text-xs text-muted-foreground">
          {course.code}
        </span>
      ),
    },
    {
      accessorKey: "title",
      header: "Tiêu đề",
      cell: (course) => (
        <span className="font-medium text-foreground">{course.title}</span>
      ),
    },
    {
      accessorKey: "imageSrc",
      header: "Ảnh biểu tượng",
      cell: (course) => (
        <span className="block max-w-64 truncate font-mono text-xs text-muted-foreground">
          {course.imageSrc}
        </span>
      ),
    },
    {
      className: "text-right",
      header: "Hành động",
      cell: (course) => (
        <div className="flex items-center justify-end gap-1">
          <Button
            aria-label={`Chỉnh sửa ${course.title}`}
            onClick={() => onEdit(course)}
            size="icon"
            variant="ghost"
          >
            <Edit2 aria-hidden="true" />
          </Button>
          <Button
            aria-label={`Xóa ${course.title}`}
            onClick={() => onDelete(course)}
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
