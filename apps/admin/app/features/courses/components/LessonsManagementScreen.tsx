"use client";

import { Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { DataTableCard } from "@/app/components/data-table";
import { ErrorState } from "@/app/components/feedback/ErrorState";
import { DestructiveActionDialog } from "@/app/components/forms/DestructiveActionDialog";
import { PageHeader } from "@/app/components/layout/PageHeader";
import { Button } from "@/app/components/ui/button";
import {
  useCreateLesson,
  useDeleteLesson,
  useLessons,
  useUpdateLesson,
} from "@/app/features/courses/hooks/use-lessons";
import { useAllUnits } from "@/app/features/courses/hooks/use-units";
import type { CourseLessonViewModel } from "@/app/features/courses/types/course-management.types";
import { useDebounce } from "@/app/hooks/use-debounce";
import { useTableControls } from "@/app/hooks/use-table-controls";

import { getLessonColumns } from "./lessons/lesson-columns";
import { LessonEditorForm } from "./lessons/LessonEditorForm";
import type { LessonEditorValues } from "./lessons/lesson-editor.schema";

export function LessonsManagementScreen() {
  const controls = useTableControls();
  const lessonsQuery = useLessons({
    limit: controls.pageSize,
    page: controls.currentPage,
    search: useDebounce(controls.searchQuery, 450),
  });
  const unitsQuery = useAllUnits();
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingLesson, setEditingLesson] =
    useState<CourseLessonViewModel | null>(null);
  const [deletingLesson, setDeletingLesson] =
    useState<CourseLessonViewModel | null>(null);
  const [submissionError, setSubmissionError] = useState<string>();
  const createMutation = useCreateLesson();
  const updateMutation = useUpdateLesson(editingLesson?.id ?? null);
  const deleteMutation = useDeleteLesson();

  const openCreate = () => {
    setEditingLesson(null);
    setSubmissionError(undefined);
    setEditorOpen(true);
  };
  const openEdit = (lesson: CourseLessonViewModel) => {
    setEditingLesson(lesson);
    setSubmissionError(undefined);
    setEditorOpen(true);
  };
  const submitLesson = async (values: LessonEditorValues) => {
    setSubmissionError(undefined);
    try {
      if (editingLesson) await updateMutation.mutateAsync(values);
      else await createMutation.mutateAsync(values);
      toast.success(editingLesson ? "Đã cập nhật bài học." : "Đã tạo bài học.");
      setEditorOpen(false);
    } catch (error) {
      setSubmissionError(
        error instanceof Error ? error.message : "Không thể lưu bài học.",
      );
    }
  };
  const deleteLesson = async () => {
    if (!deletingLesson) return;
    try {
      await deleteMutation.mutateAsync(deletingLesson.id);
      toast.success("Đã xóa bài học.");
      setDeletingLesson(null);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Không thể xóa bài học.",
      );
    }
  };

  const lessons = lessonsQuery.data?.data ?? [];
  const pagination = lessonsQuery.data?.pagination;
  const columns = getLessonColumns({
    onDelete: setDeletingLesson,
    onEdit: openEdit,
  });

  return (
    <div className="space-y-6">
      <PageHeader
        actions={
          <Button disabled={unitsQuery.isLoading} onClick={openCreate}>
            <Plus aria-hidden="true" /> Thêm bài học
          </Button>
        }
        description="Quản lý các bài học bên trong từng chương."
        eyebrow="Nội dung khóa học"
        title="Bài học"
      />
      {lessonsQuery.isError ? (
        <ErrorState
          description="Không thể tải danh sách bài học."
          onRetry={() => void lessonsQuery.refetch()}
        />
      ) : (
        <DataTableCard<CourseLessonViewModel>
          columns={columns}
          currentPage={controls.currentPage}
          data={lessons}
          emptyMessage="Không có bài học phù hợp."
          getRowId={(lesson) => String(lesson.id)}
          isFetching={lessonsQuery.isFetching}
          isLoading={lessonsQuery.isLoading}
          onPageChange={controls.setCurrentPage}
          onPageSizeChange={controls.setPageSize}
          onSearchChange={controls.setSearchQuery}
          pageSize={controls.pageSize}
          searchPlaceholder="Tìm kiếm bài học..."
          searchQuery={controls.searchQuery}
          totalItems={pagination?.total ?? 0}
          totalPages={pagination?.totalPages ?? 1}
        />
      )}
      <LessonEditorForm
        error={submissionError}
        isOpen={editorOpen}
        isSubmitting={createMutation.isPending || updateMutation.isPending}
        lesson={editingLesson}
        onOpenChange={setEditorOpen}
        onSubmit={submitLesson}
        units={unitsQuery.data ?? []}
      />
      <DestructiveActionDialog
        isPending={deleteMutation.isPending}
        onConfirm={deleteLesson}
        onOpenChange={(open) => {
          if (!open) setDeletingLesson(null);
        }}
        open={Boolean(deletingLesson)}
        resourceName={deletingLesson?.title ?? "bài học này"}
      />
    </div>
  );
}
