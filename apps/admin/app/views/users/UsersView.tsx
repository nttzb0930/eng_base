"use client";

import React, { useCallback, useMemo, useState } from "react";
import { Plus, Edit2, Trash2, Loader2, ShieldAlert, UserCheck } from "lucide-react";
import { toast } from "sonner";

import type { UpdateUserBody, User } from "@/app/features/users/types/user-management.types";
import { useUsers, useCreateUser, useUpdateUser, useDeleteUser } from "@/app/features/users/hooks/use-users";
import { useTableControls } from "@/app/hooks/use-table-controls";
import { useDebounce } from "@/app/hooks/use-debounce";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/app/components/ui/dialog";
import { Label } from "@/app/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/app/components/ui/select";
import { DataTableCard, type Column } from "@/app/components/data-table";

export function UsersView() {
  const { currentPage, setCurrentPage, pageSize, setPageSize, searchQuery, setSearchQuery } = useTableControls();
  const debouncedSearch = useDebounce(searchQuery, 450);
  const usersQuery = useUsers({ page: currentPage, limit: pageSize, search: debouncedSearch });
  const deleteUserMutation = useDeleteUser();
  const users = usersQuery.data?.data ?? [];
  const pagination = usersQuery.data?.pagination;

  const handleDelete = useCallback(async (id: string) => {
    if (!confirm("Bạn có chắc chắn muốn xóa người dùng này?")) return;
    try { await deleteUserMutation.mutateAsync(id); toast.success("Xóa người dùng thành công"); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Thao tác thất bại"); }
  }, [deleteUserMutation]);

  const [isOpen, setIsOpen] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"ADMIN" | "USER">("USER");
  const createUserMutation = useCreateUser();
  const updateUserMutation = useUpdateUser(activeId);
  const formSubmitting = createUserMutation.isPending || updateUserMutation.isPending;

  const handleOpenCreate = () => {
    setIsEdit(false); setActiveId(null); setUsername(""); setEmail(""); setPassword(""); setRole("USER"); setIsOpen(true);
  };
  const handleOpenEdit = (user: User) => {
    setIsEdit(true); setActiveId(user.id); setUsername(user.username); setEmail(user.email); setPassword(""); setRole(user.role); setIsOpen(true);
  };
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !email.trim() || (!isEdit && !password.trim())) { toast.error("Vui lòng điền đầy đủ thông tin"); return; }
    try {
      const body: UpdateUserBody = { username, email, role };
      if (password.trim()) body.password = password;
      if (isEdit && activeId !== null) { await updateUserMutation.mutateAsync(body); }
      else { await createUserMutation.mutateAsync({ ...body, email, password, username }); }
      toast.success(isEdit ? "Cập nhật người dùng thành công" : "Tạo người dùng thành công");
      setIsOpen(false);
    } catch (error) { toast.error(error instanceof Error ? error.message : "Thao tác thất bại"); }
  };

  const columns = useMemo<Column<User>[]>(() => [
    {
      header: "Tên đăng nhập",
      accessorKey: "username",
      cell: (item) => <span className="font-bold text-zinc-900">{item.username}</span>,
    },
    {
      header: "Email liên hệ",
      accessorKey: "email",
      cell: (item) => <span className="font-medium text-zinc-600 text-sm">{item.email}</span>,
    },
    {
      header: "Vai trò",
      accessorKey: "role",
      cell: (item) => item.role === "ADMIN" ? (
        <span className="inline-flex items-center gap-1.5 text-red-600 text-xs font-bold bg-red-50 px-2 py-0.5 rounded-full border border-red-100">
          <ShieldAlert className="h-3 w-3" /> Admin
        </span>
      ) : (
        <span className="inline-flex items-center gap-1.5 text-zinc-600 text-xs font-bold bg-zinc-50 px-2 py-0.5 rounded-full border border-zinc-200">
          <UserCheck className="h-3 w-3" /> Học viên
        </span>
      ),
    },
    {
      header: "Ngày tạo",
      accessorKey: "createdAt",
      cell: (item) => (
        <span className="text-zinc-400 text-xs font-medium">
          {item.createdAt ? new Date(item.createdAt).toLocaleDateString("vi-VN", { year: "numeric", month: "short", day: "numeric" }) : "-"}
        </span>
      ),
    },
    {
      header: "Hành động",
      className: "text-right",
      cell: (item) => (
        <div className="flex items-center justify-end gap-1">
          <Button size="icon" variant="ghost" onClick={() => handleOpenEdit(item)} className="h-8 w-8 text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 rounded-lg cursor-pointer">
            <Edit2 className="h-3.5 w-3.5" />
          </Button>
          <Button size="icon" variant="ghost" onClick={() => handleDelete(item.id)} className="h-8 w-8 text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded-lg cursor-pointer">
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      ),
    },
  ], [handleDelete]);

  return (
    <div className="max-w-7xl w-full mx-auto p-4 md:p-6 space-y-6">
      <div className="flex items-center justify-between border-b border-zinc-200 pb-4">
        <div>
          <h3 className="text-lg font-bold text-zinc-900 tracking-tight">Danh sách người dùng (Users)</h3>
          <p className="text-xs text-zinc-500 mt-0.5 font-medium">Quản lý tài khoản đăng nhập admin và thông tin cơ bản người dùng</p>
        </div>
        <Button onClick={handleOpenCreate} className="bg-zinc-900 hover:bg-zinc-800 text-zinc-50 font-medium rounded-lg h-9 px-4 gap-2 cursor-pointer">
          <Plus className="h-4 w-4" /> Thêm bản ghi mới
        </Button>
      </div>

      <DataTableCard<User>
        data={users}
        columns={columns}
        isLoading={usersQuery.isLoading}
        isFetching={usersQuery.isFetching}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Tìm kiếm người dùng..."
        emptyMessage="Không tìm thấy bản ghi nào."
        currentPage={currentPage}
        pageSize={pageSize}
        totalItems={pagination?.total ?? 0}
        totalPages={pagination?.totalPages ?? 1}
        onPageChange={setCurrentPage}
        onPageSizeChange={setPageSize}
      />

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="bg-white text-zinc-900 border-zinc-200 max-w-lg p-6 rounded-xl shadow-lg">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold tracking-tight">{isEdit ? "Chỉnh sửa người dùng" : "Tạo người dùng mới"}</DialogTitle>
            <DialogDescription className="text-zinc-500 text-xs font-medium">Nhập thông tin đăng nhập và quyền truy cập</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label className="text-zinc-700 font-semibold text-sm">Tên đăng nhập (Username)</Label>
              <Input required value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Nhập tên đăng nhập" className="bg-white border-zinc-200 text-zinc-900 focus-visible:ring-zinc-400" />
            </div>
            <div className="space-y-2">
              <Label className="text-zinc-700 font-semibold text-sm">Địa chỉ email</Label>
              <Input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Nhập địa chỉ email" className="bg-white border-zinc-200 text-zinc-900 focus-visible:ring-zinc-400" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-zinc-700 font-semibold text-sm">Mật khẩu</Label>
                <Input type="password" required={!isEdit} value={password} onChange={(e) => setPassword(e.target.value)} placeholder={isEdit ? "Nhập để đổi mật khẩu" : "Nhập mật khẩu"} className="bg-white border-zinc-200 text-zinc-900 focus-visible:ring-zinc-400" />
              </div>
              <div className="space-y-2">
                <Label className="text-zinc-700 font-semibold text-sm">Vai trò phân quyền</Label>
                <Select value={role} onValueChange={(v) => setRole(v as "ADMIN" | "USER")} required>
                  <SelectTrigger className="bg-white border-zinc-200 text-zinc-950"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-white border-zinc-200 text-zinc-900">
                    <SelectItem value="USER">USER (Học viên)</SelectItem>
                    <SelectItem value="ADMIN">ADMIN (Quản trị)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-100">
              <Button type="button" variant="outline" onClick={() => setIsOpen(false)} className="border-zinc-200 hover:bg-zinc-50 text-zinc-700 font-semibold rounded-lg h-9 px-4 cursor-pointer">Hủy</Button>
              <Button type="submit" disabled={formSubmitting} className="bg-zinc-900 hover:bg-zinc-800 text-zinc-50 font-semibold rounded-lg h-9 px-4 cursor-pointer">
                {formSubmitting ? <span className="flex items-center gap-1.5"><Loader2 className="h-4 w-4 animate-spin" /> Đang lưu...</span> : "Lưu thay đổi"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
