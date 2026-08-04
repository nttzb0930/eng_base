import { Edit2, ShieldAlert, Trash2, UserCheck } from "lucide-react";

import type { Column } from "@/app/components/data-table";
import { Badge } from "@/app/components/ui/badge";
import { Button } from "@/app/components/ui/button";
import type { User } from "@/app/features/users/types/user-management.types";

export function getUserColumns({
  onDelete,
  onEdit,
}: {
  onDelete(user: User): void;
  onEdit(user: User): void;
}): Column<User>[] {
  return [
    {
      accessorKey: "username",
      header: "Tên đăng nhập",
      cell: (user) => <span className="font-medium">{user.username}</span>,
    },
    {
      accessorKey: "email",
      header: "Email liên hệ",
      cell: (user) => (
        <span className="text-sm text-muted-foreground">{user.email}</span>
      ),
    },
    {
      accessorKey: "role",
      header: "Vai trò",
      cell: (user) => (
        <Badge variant={user.role === "ADMIN" ? "destructive" : "secondary"}>
          {user.role === "ADMIN" ? (
            <ShieldAlert aria-hidden="true" />
          ) : (
            <UserCheck aria-hidden="true" />
          )}
          {user.role === "ADMIN" ? "Quản trị viên" : "Học viên"}
        </Badge>
      ),
    },
    {
      accessorKey: "createdAt",
      header: "Ngày tạo",
      cell: (user) => (
        <span className="text-xs text-muted-foreground">
          {user.createdAt
            ? new Date(user.createdAt).toLocaleDateString("vi-VN", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })
            : "—"}
        </span>
      ),
    },
    {
      className: "text-right",
      header: "Hành động",
      cell: (user) => (
        <div className="flex justify-end gap-1">
          <Button
            aria-label={`Chỉnh sửa ${user.username}`}
            onClick={() => onEdit(user)}
            size="icon"
            variant="ghost"
          >
            <Edit2 aria-hidden="true" />
          </Button>
          <Button
            aria-label={`Xóa ${user.username}`}
            onClick={() => onDelete(user)}
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
