import type { AdminReadingSourceCandidateSummary } from "@repo/shared";

import type { Column } from "@/app/components/data-table";
import { Badge } from "@/app/components/ui/badge";
import { Button } from "@/app/components/ui/button";

const statusLabel = {
  CONVERTED: "Đã chuyển đổi",
  PENDING: "Chờ duyệt",
  REJECTED: "Đã từ chối",
} as const;

export function getReadingSourceCandidateColumns(
  onReview: (candidate: AdminReadingSourceCandidateSummary) => void,
): Column<AdminReadingSourceCandidateSummary>[] {
  return [
    {
      accessorKey: "sourceTitle",
      header: "Candidate",
      cell: (candidate) => (
        <div>
          <p className="font-medium">{candidate.sourceTitle}</p>
          <p className="mt-1 max-w-80 truncate font-mono text-xs text-muted-foreground">
            {candidate.sourceId}
          </p>
        </div>
      ),
    },
    { accessorKey: "sourceLevel", header: "Level" },
    {
      accessorKey: "questionCount",
      className: "tabular-nums",
      header: "Câu hỏi",
    },
    {
      accessorKey: "status",
      header: "Trạng thái",
      cell: (candidate) => (
        <Badge variant={candidate.status === "PENDING" ? "secondary" : "outline"}>
          {statusLabel[candidate.status]}
        </Badge>
      ),
    },
    {
      className: "text-right",
      header: "Thao tác",
      cell: (candidate) => (
        <Button onClick={() => onReview(candidate)} size="sm" variant="outline">
          Xem và duyệt
        </Button>
      ),
    },
  ];
}
