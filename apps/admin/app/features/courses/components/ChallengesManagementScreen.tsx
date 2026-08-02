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
  useChallenges,
  useCreateChallenge,
  useDeleteChallenge,
  useUpdateChallenge,
} from "@/app/features/courses/hooks/use-challenges";
import { useAllLessons } from "@/app/features/courses/hooks/use-lessons";
import type { LessonChallengeViewModel } from "@/app/features/courses/types/course-management.types";
import { useDebounce } from "@/app/hooks/use-debounce";
import { useTableControls } from "@/app/hooks/use-table-controls";

import { getChallengeColumns } from "./challenges/challenge-columns";
import { ChallengeEditorForm } from "./challenges/ChallengeEditorForm";
import type { ChallengeEditorValues } from "./challenges/challenge-editor.schema";

export function ChallengesManagementScreen() {
  const controls = useTableControls();
  const debouncedSearch = useDebounce(controls.searchQuery, 450);
  const challengesQuery = useChallenges({
    limit: controls.pageSize,
    page: controls.currentPage,
    search: debouncedSearch,
  });
  const lessonsQuery = useAllLessons();
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingChallenge, setEditingChallenge] =
    useState<LessonChallengeViewModel | null>(null);
  const [deletingChallenge, setDeletingChallenge] =
    useState<LessonChallengeViewModel | null>(null);
  const [submissionError, setSubmissionError] = useState<string>();
  const createMutation = useCreateChallenge();
  const updateMutation = useUpdateChallenge(editingChallenge?.id ?? null);
  const deleteMutation = useDeleteChallenge();

  const openCreate = () => {
    setEditingChallenge(null);
    setSubmissionError(undefined);
    setEditorOpen(true);
  };
  const openEdit = (challenge: LessonChallengeViewModel) => {
    setEditingChallenge(challenge);
    setSubmissionError(undefined);
    setEditorOpen(true);
  };
  const submitChallenge = async (values: ChallengeEditorValues) => {
    setSubmissionError(undefined);
    const payload = {
      ...values,
      direction: values.type === "SELECT" ? values.direction : null,
    };
    try {
      if (editingChallenge) await updateMutation.mutateAsync(payload);
      else await createMutation.mutateAsync(payload);
      toast.success(
        editingChallenge ? "Đã cập nhật thử thách." : "Đã tạo thử thách.",
      );
      setEditorOpen(false);
    } catch (error) {
      setSubmissionError(
        error instanceof Error ? error.message : "Không thể lưu thử thách.",
      );
    }
  };
  const deleteChallenge = async () => {
    if (!deletingChallenge) return;
    try {
      await deleteMutation.mutateAsync(deletingChallenge.id);
      toast.success("Đã xóa thử thách.");
      setDeletingChallenge(null);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Không thể xóa thử thách.",
      );
    }
  };

  const challenges = challengesQuery.data?.data ?? [];
  const pagination = challengesQuery.data?.pagination;
  const columns = getChallengeColumns({
    onDelete: setDeletingChallenge,
    onEdit: openEdit,
  });

  return (
    <div className="space-y-6">
      <PageHeader
        actions={
          <Button disabled={lessonsQuery.isLoading} onClick={openCreate}>
            <Plus aria-hidden="true" /> Thêm thử thách
          </Button>
        }
        description="Tạo câu hỏi SELECT hoặc ASSIST cho từng bài học."
        eyebrow="Nội dung khóa học"
        title="Thử thách"
      />
      {challengesQuery.isError ? (
        <ErrorState
          description="Không thể tải danh sách thử thách."
          onRetry={() => void challengesQuery.refetch()}
        />
      ) : (
        <DataTableCard<LessonChallengeViewModel>
          columns={columns}
          currentPage={controls.currentPage}
          data={challenges}
          emptyMessage="Không có thử thách phù hợp."
          getRowId={(challenge) => String(challenge.id)}
          isFetching={challengesQuery.isFetching}
          isLoading={challengesQuery.isLoading}
          onPageChange={controls.setCurrentPage}
          onPageSizeChange={controls.setPageSize}
          onSearchChange={controls.setSearchQuery}
          pageSize={controls.pageSize}
          searchPlaceholder="Tìm kiếm câu hỏi..."
          searchQuery={controls.searchQuery}
          totalItems={pagination?.total ?? 0}
          totalPages={pagination?.totalPages ?? 1}
        />
      )}
      <ChallengeEditorForm
        challenge={editingChallenge}
        error={submissionError}
        isOpen={editorOpen}
        isSubmitting={createMutation.isPending || updateMutation.isPending}
        lessons={lessonsQuery.data ?? []}
        onOpenChange={setEditorOpen}
        onSubmit={submitChallenge}
      />
      <DestructiveActionDialog
        isPending={deleteMutation.isPending}
        onConfirm={deleteChallenge}
        onOpenChange={(open) => {
          if (!open) setDeletingChallenge(null);
        }}
        open={Boolean(deletingChallenge)}
        resourceName={
          deletingChallenge ? `câu hỏi #${deletingChallenge.id}` : "câu hỏi này"
        }
      />
    </div>
  );
}
