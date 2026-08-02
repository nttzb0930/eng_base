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
  useChallengeOptions,
  useCreateChallengeOption,
  useDeleteChallengeOption,
  useUpdateChallengeOption,
} from "@/app/features/courses/hooks/use-challenge-options";
import { useAllChallenges } from "@/app/features/courses/hooks/use-challenges";
import type { LessonChallengeOptionViewModel } from "@/app/features/courses/types/course-management.types";
import { useDebounce } from "@/app/hooks/use-debounce";
import { useTableControls } from "@/app/hooks/use-table-controls";

import { getChallengeOptionColumns } from "./challenge-options/challenge-option-columns";
import { ChallengeOptionEditorForm } from "./challenge-options/ChallengeOptionEditorForm";
import type { ChallengeOptionEditorValues } from "./challenge-options/challenge-option-editor.schema";

export function ChallengeOptionsManagementScreen() {
  const controls = useTableControls();
  const optionsQuery = useChallengeOptions({
    limit: controls.pageSize,
    page: controls.currentPage,
    search: useDebounce(controls.searchQuery, 450),
  });
  const challengesQuery = useAllChallenges();
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingOption, setEditingOption] =
    useState<LessonChallengeOptionViewModel | null>(null);
  const [deletingOption, setDeletingOption] =
    useState<LessonChallengeOptionViewModel | null>(null);
  const [playingAudioUrl, setPlayingAudioUrl] = useState<string | null>(null);
  const [submissionError, setSubmissionError] = useState<string>();
  const createMutation = useCreateChallengeOption();
  const updateMutation = useUpdateChallengeOption(editingOption?.id ?? null);
  const deleteMutation = useDeleteChallengeOption();

  const playAudio = (url: string) => {
    const audio = new Audio(url);
    setPlayingAudioUrl(url);
    audio.onended = () => setPlayingAudioUrl(null);
    audio.play().catch(() => {
      setPlayingAudioUrl(null);
      toast.error("Không thể phát âm thanh.");
    });
  };
  const openCreate = () => {
    setEditingOption(null);
    setSubmissionError(undefined);
    setEditorOpen(true);
  };
  const openEdit = (option: LessonChallengeOptionViewModel) => {
    setEditingOption(option);
    setSubmissionError(undefined);
    setEditorOpen(true);
  };
  const submitOption = async (values: ChallengeOptionEditorValues) => {
    setSubmissionError(undefined);
    const payload = {
      ...values,
      audioSrc: values.audioSrc || null,
      imageSrc: values.imageSrc || null,
    };
    try {
      if (editingOption) await updateMutation.mutateAsync(payload);
      else await createMutation.mutateAsync(payload);
      toast.success(editingOption ? "Đã cập nhật đáp án." : "Đã tạo đáp án.");
      setEditorOpen(false);
    } catch (error) {
      setSubmissionError(
        error instanceof Error ? error.message : "Không thể lưu đáp án.",
      );
    }
  };
  const deleteOption = async () => {
    if (!deletingOption) return;
    try {
      await deleteMutation.mutateAsync(deletingOption.id);
      toast.success("Đã xóa đáp án.");
      setDeletingOption(null);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Không thể xóa đáp án.",
      );
    }
  };

  const options = optionsQuery.data?.data ?? [];
  const pagination = optionsQuery.data?.pagination;
  const columns = getChallengeOptionColumns({
    onDelete: setDeletingOption,
    onEdit: openEdit,
    onPlayAudio: playAudio,
    playingAudioUrl,
  });

  return (
    <div className="space-y-6">
      <PageHeader
        actions={
          <Button disabled={challengesQuery.isLoading} onClick={openCreate}>
            <Plus aria-hidden="true" /> Thêm đáp án
          </Button>
        }
        description="Quản lý đáp án, tính đúng sai và media của từng câu hỏi."
        eyebrow="Nội dung khóa học"
        title="Đáp án thử thách"
      />
      {optionsQuery.isError ? (
        <ErrorState
          description="Không thể tải danh sách đáp án."
          onRetry={() => void optionsQuery.refetch()}
        />
      ) : (
        <DataTableCard<LessonChallengeOptionViewModel>
          columns={columns}
          currentPage={controls.currentPage}
          data={options}
          emptyMessage="Không có đáp án phù hợp."
          getRowId={(option) => String(option.id)}
          isFetching={optionsQuery.isFetching}
          isLoading={optionsQuery.isLoading}
          onPageChange={controls.setCurrentPage}
          onPageSizeChange={controls.setPageSize}
          onSearchChange={controls.setSearchQuery}
          pageSize={controls.pageSize}
          searchPlaceholder="Tìm kiếm đáp án..."
          searchQuery={controls.searchQuery}
          totalItems={pagination?.total ?? 0}
          totalPages={pagination?.totalPages ?? 1}
        />
      )}
      <ChallengeOptionEditorForm
        challenges={challengesQuery.data ?? []}
        error={submissionError}
        isOpen={editorOpen}
        isSubmitting={createMutation.isPending || updateMutation.isPending}
        onOpenChange={setEditorOpen}
        onSubmit={submitOption}
        option={editingOption}
      />
      <DestructiveActionDialog
        isPending={deleteMutation.isPending}
        onConfirm={deleteOption}
        onOpenChange={(open) => {
          if (!open) setDeletingOption(null);
        }}
        open={Boolean(deletingOption)}
        resourceName={deletingOption ? `đáp án #${deletingOption.id}` : "đáp án này"}
      />
    </div>
  );
}
