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
  useCourses,
  useCreateCourse,
  useDeleteCourse,
  useUpdateCourse,
} from "@/app/features/courses/hooks/use-courses";
import type { CourseViewModel } from "@/app/features/courses/types/course-management.types";
import { useDebounce } from "@/app/hooks/use-debounce";
import { useTableControls } from "@/app/hooks/use-table-controls";

import { getCourseColumns } from "./courses/course-columns";
import { CourseEditorForm } from "./courses/CourseEditorForm";
import type { CourseEditorValues } from "./courses/course-editor.schema";

export function CoursesManagementScreen() {
  const {
    currentPage,
    pageSize,
    searchQuery,
    setCurrentPage,
    setPageSize,
    setSearchQuery,
  } = useTableControls();
  const debouncedSearch = useDebounce(searchQuery, 450);
  const coursesQuery = useCourses({
    page: currentPage,
    limit: pageSize,
    search: debouncedSearch,
  });
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<CourseViewModel | null>(null);
  const [deletingCourse, setDeletingCourse] =
    useState<CourseViewModel | null>(null);
  const [submissionError, setSubmissionError] = useState<string>();
  const createMutation = useCreateCourse();
  const updateMutation = useUpdateCourse(editingCourse?.id ?? null);
  const deleteMutation = useDeleteCourse();
  const formSubmitting = createMutation.isPending || updateMutation.isPending;

  const openCreate = () => {
    setEditingCourse(null);
    setSubmissionError(undefined);
    setEditorOpen(true);
  };

  const openEdit = (course: CourseViewModel) => {
    setEditingCourse(course);
    setSubmissionError(undefined);
    setEditorOpen(true);
  };

  const submitCourse = async (values: CourseEditorValues) => {
    setSubmissionError(undefined);
    try {
      if (editingCourse) {
        await updateMutation.mutateAsync({
          imageSrc: values.imageSrc,
          title: values.title,
        });
        toast.success("Đã cập nhật khóa học.");
      } else {
        await createMutation.mutateAsync(values);
        toast.success("Đã tạo khóa học.");
      }
      setEditorOpen(false);
    } catch (error) {
      setSubmissionError(
        error instanceof Error ? error.message : "Không thể lưu khóa học.",
      );
    }
  };

  const deleteCourse = async () => {
    if (!deletingCourse) return;
    try {
      await deleteMutation.mutateAsync(deletingCourse.id);
      toast.success("Đã xóa khóa học.");
      setDeletingCourse(null);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Không thể xóa khóa học.",
      );
    }
  };

  const courses = coursesQuery.data?.data ?? [];
  const pagination = coursesQuery.data?.pagination;
  const columns = getCourseColumns({
    onDelete: setDeletingCourse,
    onEdit: openEdit,
  });

  return (
    <div className="space-y-6">
      <PageHeader
        actions={
          <Button onClick={openCreate}>
            <Plus aria-hidden="true" />
            Thêm khóa học
          </Button>
        }
        description="Quản lý danh mục khóa học hiển thị trên ứng dụng học viên."
        eyebrow="Nội dung khóa học"
        title="Khóa học"
      />

      {coursesQuery.isError ? (
        <ErrorState
          description="Không thể tải danh sách khóa học."
          onRetry={() => void coursesQuery.refetch()}
        />
      ) : (
        <DataTableCard<CourseViewModel>
          columns={columns}
          currentPage={currentPage}
          data={courses}
          emptyMessage="Không có khóa học phù hợp."
          getRowId={(course) => String(course.id)}
          isFetching={coursesQuery.isFetching}
          isLoading={coursesQuery.isLoading}
          onPageChange={setCurrentPage}
          onPageSizeChange={setPageSize}
          onSearchChange={setSearchQuery}
          pageSize={pageSize}
          searchPlaceholder="Tìm kiếm khóa học..."
          searchQuery={searchQuery}
          totalItems={pagination?.total ?? 0}
          totalPages={pagination?.totalPages ?? 1}
        />
      )}

      <CourseEditorForm
        course={editingCourse}
        error={submissionError}
        isOpen={editorOpen}
        isSubmitting={formSubmitting}
        onOpenChange={setEditorOpen}
        onSubmit={submitCourse}
      />

      <DestructiveActionDialog
        isPending={deleteMutation.isPending}
        onConfirm={deleteCourse}
        onOpenChange={(open) => {
          if (!open) setDeletingCourse(null);
        }}
        open={Boolean(deletingCourse)}
        resourceName={deletingCourse?.title ?? "khóa học này"}
      />
    </div>
  );
}
