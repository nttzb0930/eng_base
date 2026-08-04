"use client";

import { useState } from "react";
import { toast } from "sonner";

import { DataTableCard } from "@/app/components/data-table";
import { ErrorState } from "@/app/components/feedback/ErrorState";
import { DestructiveActionDialog } from "@/app/components/forms/DestructiveActionDialog";
import { PageHeader } from "@/app/components/layout/PageHeader";
import {
  useDeletePracticeSession,
  usePracticeSessions,
} from "@/app/features/practice/hooks/use-practice-sessions";
import type { PracticeSession } from "@/app/features/practice/types/practice-session.types";
import { useDebounce } from "@/app/hooks/use-debounce";
import { useTableControls } from "@/app/hooks/use-table-controls";

import { getPracticeSessionColumns } from "./practice-session-columns";
import { PracticeSessionDetailDialog } from "./PracticeSessionDetailDialog";

export function PracticeSessionsScreen() {
  const controls = useTableControls();
  const sessionsQuery = usePracticeSessions({
    limit: controls.pageSize,
    page: controls.currentPage,
    user_id: useDebounce(controls.searchQuery, 450) || undefined,
  });
  const [detailId, setDetailId] = useState<number | null>(null);
  const [deletingSession, setDeletingSession] =
    useState<PracticeSession | null>(null);
  const deleteMutation = useDeletePracticeSession();

  const deleteSession = async () => {
    if (!deletingSession) return;
    try {
      await deleteMutation.mutateAsync(deletingSession.id);
      toast.success("Đã xóa lịch sử luyện tập.");
      setDeletingSession(null);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Không thể xóa lịch sử luyện tập.",
      );
    }
  };

  const sessions = sessionsQuery.data?.data ?? [];
  const pagination = sessionsQuery.data?.pagination;
  const columns = getPracticeSessionColumns({
    onDelete: setDeletingSession,
    onView: (session) => setDetailId(session.id),
  });

  return (
    <div className="space-y-6">
      <PageHeader
        description="Theo dõi phiên luyện tập độc lập và độ chính xác của học viên."
        eyebrow="Vận hành"
        title="Phiên luyện tập"
      />
      {sessionsQuery.isError ? (
        <ErrorState
          description="Không thể tải danh sách phiên luyện tập."
          onRetry={() => void sessionsQuery.refetch()}
        />
      ) : (
        <DataTableCard<PracticeSession>
          columns={columns}
          currentPage={controls.currentPage}
          data={sessions}
          emptyMessage="Không có phiên luyện tập phù hợp."
          getRowId={(session) => String(session.id)}
          isFetching={sessionsQuery.isFetching}
          isLoading={sessionsQuery.isLoading}
          onPageChange={controls.setCurrentPage}
          onPageSizeChange={controls.setPageSize}
          onSearchChange={controls.setSearchQuery}
          pageSize={controls.pageSize}
          searchPlaceholder="Tìm theo User ID..."
          searchQuery={controls.searchQuery}
          totalItems={pagination?.total ?? 0}
          totalPages={pagination?.totalPages ?? 1}
        />
      )}
      {detailId !== null ? (
        <PracticeSessionDetailDialog
          onClose={() => setDetailId(null)}
          sessionId={detailId}
        />
      ) : null}
      <DestructiveActionDialog
        isPending={deleteMutation.isPending}
        onConfirm={deleteSession}
        onOpenChange={(open) => {
          if (!open) setDeletingSession(null);
        }}
        open={Boolean(deletingSession)}
        resourceName={
          deletingSession ? `phiên #${deletingSession.id}` : "phiên này"
        }
      />
    </div>
  );
}
