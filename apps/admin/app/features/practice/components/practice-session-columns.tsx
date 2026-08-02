import { Eye, Trash2 } from "lucide-react";

import type { Column } from "@/app/components/data-table";
import { Badge } from "@/app/components/ui/badge";
import { Button } from "@/app/components/ui/button";
import type { PracticeSession } from "@/app/features/practice/types/practice-session.types";

function accuracyLabel(accuracy: number) {
  if (accuracy >= 80) return "Tốt";
  if (accuracy >= 50) return "Trung bình";
  return "Thấp";
}

export function getPracticeSessionColumns({
  onDelete,
  onView,
}: {
  onDelete(session: PracticeSession): void;
  onView(session: PracticeSession): void;
}): Column<PracticeSession>[] {
  return [
    {
      accessorKey: "id",
      className: "w-16",
      header: "ID",
      cell: (session) => (
        <span className="text-xs tabular-nums text-muted-foreground">
          #{session.id}
        </span>
      ),
    },
    {
      accessorKey: "userId",
      header: "Mã học viên",
      cell: (session) => (
        <span className="font-mono text-xs font-medium">{session.userId}</span>
      ),
    },
    {
      accessorKey: "mode",
      header: "Chế độ",
      cell: (session) => <Badge variant="outline">{session.mode}</Badge>,
    },
    {
      className: "text-center tabular-nums",
      header: "Đúng / Sai",
      cell: (session) => `${session.correctCount} đúng · ${session.wrongCount} sai`,
    },
    {
      accessorKey: "accuracy",
      className: "text-center",
      header: "Độ chính xác",
      cell: (session) => (
        <Badge variant={session.accuracy >= 80 ? "secondary" : "outline"}>
          {accuracyLabel(session.accuracy)} · {session.accuracy}%
        </Badge>
      ),
    },
    {
      accessorKey: "createdAt",
      header: "Thời gian tạo",
      cell: (session) => (
        <span className="text-xs text-muted-foreground">
          {session.createdAt
            ? new Date(session.createdAt).toLocaleString("vi-VN", {
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
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
      cell: (session) => (
        <div className="flex justify-end gap-1">
          <Button
            aria-label={`Xem phiên ${session.id}`}
            onClick={() => onView(session)}
            size="icon"
            variant="ghost"
          >
            <Eye aria-hidden="true" />
          </Button>
          <Button
            aria-label={`Xóa phiên ${session.id}`}
            onClick={() => onDelete(session)}
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
