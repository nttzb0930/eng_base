"use client";

import type { AdminReadingPassage, CreateReadingPassagePayload } from "@repo/shared";
import { Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { DataTableCard } from "@/app/components/data-table";
import { ErrorState } from "@/app/components/feedback/ErrorState";
import { PageHeader } from "@/app/components/layout/PageHeader";
import { Button } from "@/app/components/ui/button";
import {
  useCreateReadingPassage,
  useReadingPassages,
  useReadingTopicOptions,
  useSetReadingPublication,
  useUpdateReadingPassage,
} from "@/app/features/reading/hooks/use-reading-passages";

import { getReadingPassageColumns } from "./passage/reading-passage-columns";
import { ReadingPassageEditorDialog } from "./passage/ReadingPassageEditorDialog";

export function ReadingPassagesScreen() {
  const passagesQuery = useReadingPassages();
  const topicsQuery = useReadingTopicOptions();
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingPassage, setEditingPassage] =
    useState<AdminReadingPassage | null>(null);
  const createMutation = useCreateReadingPassage();
  const updateMutation = useUpdateReadingPassage(editingPassage?.id ?? null);
  const publishMutation = useSetReadingPublication("publish");
  const unpublishMutation = useSetReadingPublication("unpublish");
  const publicationPending =
    publishMutation.isPending || unpublishMutation.isPending;

  const openCreate = () => {
    setEditingPassage(null);
    setEditorOpen(true);
  };
  const openEdit = (passage: AdminReadingPassage) => {
    setEditingPassage(passage);
    setEditorOpen(true);
  };
  const savePassage = async (payload: CreateReadingPassagePayload) => {
    if (editingPassage) {
      await updateMutation.mutateAsync({
        body: payload.body,
        cefrLevel: payload.cefrLevel,
        estimatedMinutes: payload.estimatedMinutes,
        questions: payload.questions,
        title: payload.title,
        topicId: payload.topicId,
      });
      toast.success("Đã cập nhật passage.");
    } else {
      await createMutation.mutateAsync(payload);
      toast.success("Đã tạo passage.");
    }
  };
  const togglePublication = async (passage: AdminReadingPassage) => {
    try {
      if (passage.status === "PUBLISHED") {
        await unpublishMutation.mutateAsync(passage.id);
        toast.success("Đã gỡ xuất bản passage.");
      } else {
        await publishMutation.mutateAsync(passage.id);
        toast.success("Đã xuất bản passage.");
      }
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Không thể thay đổi trạng thái xuất bản.",
      );
    }
  };

  const passages = passagesQuery.data ?? [];
  const columns = getReadingPassageColumns({
    onEdit: openEdit,
    onTogglePublication: (passage) => void togglePublication(passage),
    publicationPending,
  });

  return (
    <div className="space-y-6">
      <PageHeader
        actions={
          <Button onClick={openCreate}>
            <Plus aria-hidden="true" /> Tạo passage
          </Button>
        }
        description="Soạn passage, câu hỏi trắc nghiệm và kiểm soát nội dung hiển thị cho học viên."
        eyebrow="Reading · CEFR A1"
        title="Nội dung đọc hiểu"
      />
      {passagesQuery.isError ? (
        <ErrorState
          description="Không thể tải danh sách passage."
          onRetry={() => void passagesQuery.refetch()}
        />
      ) : (
        <DataTableCard<AdminReadingPassage>
          columns={columns}
          data={passages}
          emptyMessage="Chưa có passage A1. Hãy tạo nội dung đầu tiên."
          getRowId={(passage) => String(passage.id)}
          isFetching={passagesQuery.isFetching}
          isLoading={passagesQuery.isLoading}
          pageSize={Math.max(passages.length, 5)}
          totalItems={passages.length}
          totalPages={0}
        />
      )}
      {editorOpen ? (
        <ReadingPassageEditorDialog
          isOpen
          isSaving={createMutation.isPending || updateMutation.isPending}
          onOpenChange={setEditorOpen}
          onSubmit={savePassage}
          passage={editingPassage}
          topics={topicsQuery.data ?? []}
        />
      ) : null}
    </div>
  );
}
