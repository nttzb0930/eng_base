"use client";

import React, { useMemo, useState } from "react";
import { BarChart3, CheckCircle2, Eye, Trash2, XCircle } from "lucide-react";
import { toast } from "sonner";

import type { PracticeSessionItem } from "@/src/services/practice-sessions/practice-sessions.service";
import { useDebounce } from "@/src/hooks/use-debounce";
import { useTableControls } from "@/src/hooks/use-table-controls";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DataTableCard, type Column } from "@/src/components/data-table";
import { useDeletePracticeSession, usePracticeSessionDetails, usePracticeSessions } from "./hooks/use-practice-sessions";
import type { PracticeSession } from "@/src/services/practice-sessions/practice-sessions.service";

export function PracticeSessionsView() {
  const { currentPage, setCurrentPage, pageSize, setPageSize, searchQuery, setSearchQuery } = useTableControls();
  const debouncedSearch = useDebounce(searchQuery, 450);

  const sessionsQuery = usePracticeSessions({
    page: currentPage,
    limit: pageSize,
    user_id: debouncedSearch || undefined,
  });
  const sessions = sessionsQuery.data?.data ?? [];
  const pagination = sessionsQuery.data?.pagination;

  // Detail Modal
  const [selectedSessionId, setSelectedSessionId] = useState(0);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const detailsQuery = usePracticeSessionDetails(selectedSessionId, isDetailsOpen && selectedSessionId > 0);
  const selectedSession = detailsQuery.data;
  const loadingDetails = detailsQuery.isLoading || detailsQuery.isFetching;
  const deleteMutation = useDeletePracticeSession();

  const handleDelete = async (id: number) => {
    if (!confirm("Bạn có chắc chắn muốn xóa bản ghi lịch sử này?")) return;
    try {
      await deleteMutation.mutateAsync(id);
      toast.success("Xóa lịch sử luyện tập thành công");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete session log");
    }
  };

  const columns = useMemo<Column<PracticeSession>[]>(
    () => [
      {
        header: "ID",
        accessorKey: "id",
        className: "w-16",
        cell: (item) => <span className="font-semibold text-zinc-400 text-xs">#{item.id}</span>,
      },
      {
        header: "Mã học viên (User ID)",
        accessorKey: "userId",
        cell: (item) => (
          <span className="font-bold text-zinc-900 text-xs font-mono">{item.userId}</span>
        ),
      },
      {
        header: "Chế độ",
        accessorKey: "mode",
        cell: (item) => (
          <span className="font-bold text-zinc-600 text-xs capitalize">{item.mode}</span>
        ),
      },
      {
        header: "Đúng / Sai",
        className: "text-center",
        cell: (item) => (
          <span className="text-xs font-semibold">
            <span className="text-emerald-600">{item.correctCount}</span>
            <span className="text-zinc-300 mx-1">/</span>
            <span className="text-red-500">{item.wrongCount}</span>
          </span>
        ),
      },
      {
        header: "Độ chính xác",
        className: "text-center",
        cell: (item) => (
          <span
            className={`font-bold text-xs ${
              item.accuracy >= 80
                ? "text-emerald-600"
                : item.accuracy >= 50
                ? "text-amber-600"
                : "text-red-500"
            }`}
          >
            {item.accuracy}%
          </span>
        ),
      },
      {
        header: "Thời gian tạo",
        accessorKey: "createdAt",
        cell: (item) => (
          <span className="text-zinc-500 text-xs font-medium">
            {item.createdAt
              ? new Date(item.createdAt).toLocaleDateString("vi-VN", {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : "-"}
          </span>
        ),
      },
      {
        header: "Hành động",
        className: "text-right",
        cell: (item) => (
          <div className="flex items-center justify-end gap-1">
            <Button
              size="icon"
              variant="ghost"
              onClick={() => { setSelectedSessionId(item.id); setIsDetailsOpen(true); }}
              className="h-8 w-8 text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 rounded-lg cursor-pointer"
            >
              <Eye className="h-3.5 w-3.5" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              onClick={() => handleDelete(item.id)}
              className="h-8 w-8 text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded-lg cursor-pointer"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  return (
    <div className="max-w-7xl w-full mx-auto p-4 md:p-6 space-y-6">
      {/* HEADER */}
      <div className="flex items-center justify-between border-b border-zinc-200 pb-4">
        <div>
          <h3 className="text-lg font-bold text-zinc-900 tracking-tight">
            Lịch sử tự luyện tập (Practice Sessions)
          </h3>
          <p className="text-xs text-zinc-500 mt-0.5 font-medium">
            Theo dõi các phiên luyện tập từ vựng độc lập và độ chính xác của học viên
          </p>
        </div>
      </div>

      <DataTableCard<PracticeSession>
        data={sessions}
        columns={columns}
        isLoading={sessionsQuery.isLoading}
        isFetching={sessionsQuery.isFetching}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Tìm theo User ID..."
        emptyMessage="Không tìm thấy bản ghi nào."
        currentPage={currentPage}
        pageSize={pageSize}
        totalItems={pagination?.total ?? 0}
        totalPages={pagination?.totalPages ?? 1}
        onPageChange={setCurrentPage}
        onPageSizeChange={setPageSize}
      />

      {/* DETAILS DIALOG */}
      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="bg-white text-zinc-900 border-zinc-200 max-w-3xl p-6 rounded-xl shadow-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader className="border-b border-zinc-100 pb-4">
            <DialogTitle className="text-xl font-bold tracking-tight">Chi tiết phiên luyện tập</DialogTitle>
            <DialogDescription className="text-zinc-500 text-xs font-medium">
              Báo cáo kết quả chi tiết từng câu trả lời của phiên tự học
            </DialogDescription>
          </DialogHeader>

          {loadingDetails ? (
            <div className="py-20 flex flex-col items-center justify-center gap-2">
              <div className="h-7 w-7 rounded-full border-2 border-zinc-300 border-t-zinc-900 animate-spin" />
              <span className="text-xs font-semibold text-zinc-400">Đang tải dữ liệu...</span>
            </div>
          ) : selectedSession ? (
            <div className="space-y-6 pt-4">
              <div className="grid grid-cols-3 gap-4">
                {[
                  { label: "Chế độ học", value: selectedSession.mode },
                  {
                    label: "Số câu Đúng/Sai",
                    value: (
                      <span>
                        <span className="text-emerald-600">{selectedSession.correctCount}</span>
                        <span className="text-zinc-400 mx-1">/</span>
                        <span className="text-red-500">{selectedSession.wrongCount}</span>
                      </span>
                    ),
                  },
                  { label: "Tỉ lệ chính xác", value: `${selectedSession.accuracy}%` },
                ].map((stat) => (
                  <Card key={stat.label} className="bg-zinc-50 border-zinc-200">
                    <CardContent className="p-4 flex flex-col items-center justify-center text-center">
                      <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">{stat.label}</span>
                      <span className="text-lg font-black text-zinc-900 mt-1 capitalize">{stat.value}</span>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <div className="space-y-3">
                <h4 className="text-sm font-bold text-zinc-900 flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" /> Danh sách câu hỏi luyện tập
                </h4>
                <div className="border border-zinc-200 rounded-xl overflow-hidden bg-white shadow-inner max-h-[40vh] overflow-y-auto">
                  <Table>
                    <TableHeader className="bg-zinc-50 sticky top-0 z-10">
                      <TableRow className="hover:bg-zinc-50 border-zinc-150">
                        {["Dạng câu hỏi", "Từ vựng", "Nghĩa tiếng Việt", "Đáp án", "Kết quả"].map((h) => (
                          <TableHead key={h} className="font-bold text-zinc-500 text-xs">{h}</TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {!selectedSession.items || selectedSession.items.length === 0 ? (
                        <TableRow className="hover:bg-transparent">
                          <TableCell colSpan={5} className="h-32 text-center text-zinc-400 font-semibold">
                            Không có câu trả lời nào được ghi lại.
                          </TableCell>
                        </TableRow>
                      ) : (
                        selectedSession.items.map((item: PracticeSessionItem) => (
                          <TableRow key={item.id} className="border-zinc-100 hover:bg-zinc-50/30 transition duration-150">
                            <TableCell className="font-bold text-zinc-500 text-[10px] uppercase font-mono">{item.challengeType}</TableCell>
                            <TableCell className="font-bold text-zinc-900 text-sm">{item.vocabularyItem?.word || "-"}</TableCell>
                            <TableCell className="font-medium text-zinc-600 text-xs max-w-[150px] truncate">{item.vocabularyItem?.primaryMeaningVi || "-"}</TableCell>
                            <TableCell className="font-medium text-zinc-400 text-xs italic">{item.answer || "-"}</TableCell>
                            <TableCell>
                              {item.correct ? (
                                <span className="inline-flex items-center gap-1 text-emerald-600 text-xs font-bold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                                  <CheckCircle2 className="h-3 w-3" /> Đúng
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-red-600 text-xs font-bold bg-red-50 px-2 py-0.5 rounded-full border border-red-100">
                                  <XCircle className="h-3 w-3" /> Sai
                                </span>
                              )}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>
          ) : null}

          <div className="flex items-center justify-end pt-4 border-t border-zinc-100 mt-4">
            <Button
              type="button"
              onClick={() => setIsDetailsOpen(false)}
              className="bg-zinc-900 hover:bg-zinc-800 text-zinc-50 font-semibold rounded-lg h-9 px-4 cursor-pointer"
            >
              Đóng
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
