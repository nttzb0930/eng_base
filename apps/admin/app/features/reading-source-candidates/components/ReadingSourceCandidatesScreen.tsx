"use client";

import type {
  AdminReadingSourceCandidateSummary,
  ReadingSourceCandidateStatus,
} from "@repo/shared";
import { useState } from "react";

import { DataTableCard } from "@/app/components/data-table";
import { ErrorState } from "@/app/components/feedback/ErrorState";
import { PageHeader } from "@/app/components/layout/PageHeader";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/components/ui/select";
import { useReadingSourceCandidates } from "@/app/features/reading-source-candidates/hooks/use-reading-source-candidates";

import { getReadingSourceCandidateColumns } from "./reading-source-candidate-columns";
import { ReadingSourceCandidateReviewDialog } from "./ReadingSourceCandidateReviewDialog";

const pageSize = 20;

export function ReadingSourceCandidatesScreen() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<"all" | ReadingSourceCandidateStatus>(
    "PENDING",
  );
  const [sourceLevel, setSourceLevel] = useState<"all" | "1" | "2">("all");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const query = useReadingSourceCandidates({
    limit: pageSize,
    page,
    search: search.trim() || undefined,
    sourceLevel: sourceLevel === "all" ? undefined : sourceLevel,
    status: status === "all" ? undefined : status,
  });
  const totalPages = Math.max(1, Math.ceil((query.data?.total ?? 0) / pageSize));
  const columns = getReadingSourceCandidateColumns(
    (candidate: AdminReadingSourceCandidateSummary) => setSelectedId(candidate.id),
  );

  const filters = (
    <div className="grid w-full gap-2 sm:grid-cols-2">
      <Select
        onValueChange={(value) => {
          setStatus(value as typeof status);
          setPage(1);
        }}
        value={status}
      >
        <SelectTrigger aria-label="Lọc trạng thái" className="w-full sm:w-44">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Tất cả trạng thái</SelectItem>
          <SelectItem value="PENDING">Chờ duyệt</SelectItem>
          <SelectItem value="CONVERTED">Đã chuyển đổi</SelectItem>
          <SelectItem value="REJECTED">Đã từ chối</SelectItem>
        </SelectContent>
      </Select>
      <Select
        onValueChange={(value) => {
          setSourceLevel(value as typeof sourceLevel);
          setPage(1);
        }}
        value={sourceLevel}
      >
        <SelectTrigger aria-label="Lọc level nguồn" className="w-full sm:w-40">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Tất cả level</SelectItem>
          <SelectItem value="1">Level 1</SelectItem>
          <SelectItem value="2">Level 2</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );

  return (
    <div className="space-y-6">
      <PageHeader
        description="Đối chiếu nguồn, gán CEFR và chuyển nội dung thành draft trước khi xuất bản."
        eyebrow="Reading · Source review"
        title="Kiểm duyệt candidate"
      />
      {query.isError ? (
        <ErrorState
          description="Không thể tải danh sách candidate."
          onRetry={() => void query.refetch()}
        />
      ) : (
        <DataTableCard<AdminReadingSourceCandidateSummary>
          columns={columns}
          currentPage={page}
          data={query.data?.items ?? []}
          emptyMessage="Không có candidate phù hợp."
          getRowId={(candidate) => String(candidate.id)}
          isFetching={query.isFetching}
          isLoading={query.isLoading}
          onPageChange={setPage}
          onSearchChange={(value) => {
            setSearch(value);
            setPage(1);
          }}
          pageSize={pageSize}
          searchPlaceholder="Tiêu đề hoặc source ID..."
          searchQuery={search}
          toolbar={filters}
          totalItems={query.data?.total ?? 0}
          totalPages={totalPages}
        />
      )}
      <ReadingSourceCandidateReviewDialog
        candidateId={selectedId}
        onClose={() => setSelectedId(null)}
      />
    </div>
  );
}
