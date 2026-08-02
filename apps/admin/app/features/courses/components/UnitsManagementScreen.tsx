"use client";

import type { CefrLevel } from "@repo/shared";
import { Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { DataTableCard } from "@/app/components/data-table";
import { ErrorState } from "@/app/components/feedback/ErrorState";
import { DestructiveActionDialog } from "@/app/components/forms/DestructiveActionDialog";
import { PageHeader } from "@/app/components/layout/PageHeader";
import { Button } from "@/app/components/ui/button";
import { useAllCourses } from "@/app/features/courses/hooks/use-courses";
import {
  useCreateUnit,
  useDeleteUnit,
  useUnits,
  useUpdateUnit,
} from "@/app/features/courses/hooks/use-units";
import type { CourseUnitViewModel } from "@/app/features/courses/types/course-management.types";
import { useDebounce } from "@/app/hooks/use-debounce";
import { useTableControls } from "@/app/hooks/use-table-controls";

import { getUnitColumns } from "./units/unit-columns";
import { UnitEditorForm } from "./units/UnitEditorForm";
import type { UnitEditorValues } from "./units/unit-editor.schema";

export function UnitsManagementScreen() {
  const controls = useTableControls();
  const debouncedSearch = useDebounce(controls.searchQuery, 450);
  const unitsQuery = useUnits({
    limit: controls.pageSize,
    page: controls.currentPage,
    search: debouncedSearch,
  });
  const coursesQuery = useAllCourses();
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingUnit, setEditingUnit] = useState<CourseUnitViewModel | null>(null);
  const [deletingUnit, setDeletingUnit] = useState<CourseUnitViewModel | null>(null);
  const [submissionError, setSubmissionError] = useState<string>();
  const createMutation = useCreateUnit();
  const updateMutation = useUpdateUnit(editingUnit?.id ?? null);
  const deleteMutation = useDeleteUnit();

  const openCreate = () => {
    setEditingUnit(null);
    setSubmissionError(undefined);
    setEditorOpen(true);
  };

  const openEdit = (unit: CourseUnitViewModel) => {
    setEditingUnit(unit);
    setSubmissionError(undefined);
    setEditorOpen(true);
  };

  const submitUnit = async (values: UnitEditorValues) => {
    setSubmissionError(undefined);
    const payload = {
      ...values,
      cefrLevel: values.cefrLevel === "none" ? null : (values.cefrLevel as CefrLevel),
    };
    try {
      if (editingUnit) {
        await updateMutation.mutateAsync(payload);
        toast.success("Đã cập nhật chương học.");
      } else {
        await createMutation.mutateAsync(payload);
        toast.success("Đã tạo chương học.");
      }
      setEditorOpen(false);
    } catch (error) {
      setSubmissionError(
        error instanceof Error ? error.message : "Không thể lưu chương học.",
      );
    }
  };

  const deleteUnit = async () => {
    if (!deletingUnit) return;
    try {
      await deleteMutation.mutateAsync(deletingUnit.id);
      toast.success("Đã xóa chương học.");
      setDeletingUnit(null);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Không thể xóa chương học.",
      );
    }
  };

  const units = unitsQuery.data?.data ?? [];
  const pagination = unitsQuery.data?.pagination;
  const columns = getUnitColumns({ onDelete: setDeletingUnit, onEdit: openEdit });

  return (
    <div className="space-y-6">
      <PageHeader
        actions={
          <Button disabled={coursesQuery.isLoading} onClick={openCreate}>
            <Plus aria-hidden="true" />
            Thêm chương
          </Button>
        }
        description="Sắp xếp chương, gán khóa học và trình độ CEFR."
        eyebrow="Nội dung khóa học"
        title="Chương học"
      />

      {unitsQuery.isError ? (
        <ErrorState
          description="Không thể tải danh sách chương học."
          onRetry={() => void unitsQuery.refetch()}
        />
      ) : (
        <DataTableCard<CourseUnitViewModel>
          columns={columns}
          currentPage={controls.currentPage}
          data={units}
          emptyMessage="Không có chương học phù hợp."
          getRowId={(unit) => String(unit.id)}
          isFetching={unitsQuery.isFetching}
          isLoading={unitsQuery.isLoading}
          onPageChange={controls.setCurrentPage}
          onPageSizeChange={controls.setPageSize}
          onSearchChange={controls.setSearchQuery}
          pageSize={controls.pageSize}
          searchPlaceholder="Tìm kiếm chương học..."
          searchQuery={controls.searchQuery}
          totalItems={pagination?.total ?? 0}
          totalPages={pagination?.totalPages ?? 1}
        />
      )}

      <UnitEditorForm
        courses={coursesQuery.data ?? []}
        error={submissionError}
        isOpen={editorOpen}
        isSubmitting={createMutation.isPending || updateMutation.isPending}
        onOpenChange={setEditorOpen}
        onSubmit={submitUnit}
        unit={editingUnit}
      />
      <DestructiveActionDialog
        isPending={deleteMutation.isPending}
        onConfirm={deleteUnit}
        onOpenChange={(open) => {
          if (!open) setDeletingUnit(null);
        }}
        open={Boolean(deletingUnit)}
        resourceName={deletingUnit?.title ?? "chương học này"}
      />
    </div>
  );
}
