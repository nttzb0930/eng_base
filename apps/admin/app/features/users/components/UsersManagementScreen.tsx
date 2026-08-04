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
  useCreateUser,
  useDeleteUser,
  useUpdateUser,
  useUsers,
} from "@/app/features/users/hooks/use-users";
import type {
  UpdateUserBody,
  User,
} from "@/app/features/users/types/user-management.types";
import { useDebounce } from "@/app/hooks/use-debounce";
import { useTableControls } from "@/app/hooks/use-table-controls";

import { getUserColumns } from "./user-columns";
import { UserEditorForm } from "./UserEditorForm";
import type { UserEditorValues } from "./user-editor.schema";

export function UsersManagementScreen() {
  const controls = useTableControls();
  const usersQuery = useUsers({
    limit: controls.pageSize,
    page: controls.currentPage,
    search: useDebounce(controls.searchQuery, 450),
  });
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [deletingUser, setDeletingUser] = useState<User | null>(null);
  const [submissionError, setSubmissionError] = useState<string>();
  const createMutation = useCreateUser();
  const updateMutation = useUpdateUser(editingUser?.id ?? null);
  const deleteMutation = useDeleteUser();

  const openCreate = () => {
    setEditingUser(null);
    setSubmissionError(undefined);
    setEditorOpen(true);
  };
  const openEdit = (user: User) => {
    setEditingUser(user);
    setSubmissionError(undefined);
    setEditorOpen(true);
  };
  const saveUser = async (values: UserEditorValues) => {
    setSubmissionError(undefined);
    try {
      if (editingUser) {
        const payload: UpdateUserBody = {
          email: values.email,
          role: values.role,
          username: values.username,
        };
        if (values.password.trim()) payload.password = values.password;
        await updateMutation.mutateAsync(payload);
        toast.success("Đã cập nhật người dùng.");
      } else {
        await createMutation.mutateAsync({
          email: values.email,
          password: values.password,
          role: values.role,
          username: values.username,
        });
        toast.success("Đã tạo người dùng.");
      }
      setEditorOpen(false);
    } catch (error) {
      setSubmissionError(
        error instanceof Error ? error.message : "Không thể lưu người dùng.",
      );
    }
  };
  const deleteUser = async () => {
    if (!deletingUser) return;
    try {
      await deleteMutation.mutateAsync(deletingUser.id);
      toast.success("Đã xóa người dùng.");
      setDeletingUser(null);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Không thể xóa người dùng.",
      );
    }
  };

  const users = usersQuery.data?.data ?? [];
  const pagination = usersQuery.data?.pagination;
  const columns = getUserColumns({ onDelete: setDeletingUser, onEdit: openEdit });

  return (
    <div className="space-y-6">
      <PageHeader
        actions={
          <Button onClick={openCreate}>
            <Plus aria-hidden="true" /> Thêm người dùng
          </Button>
        }
        description="Quản lý tài khoản đăng nhập và vai trò truy cập hệ thống."
        eyebrow="Vận hành"
        title="Người dùng"
      />
      {usersQuery.isError ? (
        <ErrorState
          description="Không thể tải danh sách người dùng."
          onRetry={() => void usersQuery.refetch()}
        />
      ) : (
        <DataTableCard<User>
          columns={columns}
          currentPage={controls.currentPage}
          data={users}
          emptyMessage="Không có người dùng phù hợp."
          getRowId={(user) => user.id}
          isFetching={usersQuery.isFetching}
          isLoading={usersQuery.isLoading}
          onPageChange={controls.setCurrentPage}
          onPageSizeChange={controls.setPageSize}
          onSearchChange={controls.setSearchQuery}
          pageSize={controls.pageSize}
          searchPlaceholder="Tìm kiếm người dùng..."
          searchQuery={controls.searchQuery}
          totalItems={pagination?.total ?? 0}
          totalPages={pagination?.totalPages ?? 1}
        />
      )}
      {editorOpen ? (
        <UserEditorForm
          error={submissionError}
          isSubmitting={createMutation.isPending || updateMutation.isPending}
          onClose={() => setEditorOpen(false)}
          onSubmit={saveUser}
          user={editingUser}
        />
      ) : null}
      <DestructiveActionDialog
        isPending={deleteMutation.isPending}
        onConfirm={deleteUser}
        onOpenChange={(open) => {
          if (!open) setDeletingUser(null);
        }}
        open={Boolean(deletingUser)}
        resourceName={deletingUser?.username ?? "người dùng này"}
      />
    </div>
  );
}
