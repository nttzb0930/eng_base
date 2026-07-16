"use client";

import React, { useState } from "react";
import { Plus, Edit2, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";

import type { LessonChallengeViewModel as Challenge } from "../model/course-management.view-model";
import { useTableControls } from "@/src/hooks/use-table-controls";
import { useDebounce } from "@/src/hooks/use-debounce";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DataTableCard, type Column } from "@/src/components/data-table";
import { useAllLessons } from "../lessons";
import {
  useChallenges,
  useCreateChallenge,
  useDeleteChallenge,
  useUpdateChallenge,
} from "./challenge.queries";

export function ChallengesView() {
  const {
    currentPage,
    setCurrentPage,
    pageSize,
    setPageSize,
    searchQuery,
    setSearchQuery,
  } = useTableControls();
  const debouncedSearch = useDebounce(searchQuery, 450);
  const challengesQuery = useChallenges({
    page: currentPage,
    limit: pageSize,
    search: debouncedSearch,
  });
  const lessonsQuery = useAllLessons();
  const challenges = challengesQuery.data?.data ?? [];
  const lessons = lessonsQuery.data ?? [];
  const pagination = challengesQuery.data?.pagination;

  const [isOpen, setIsOpen] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [question, setQuestion] = useState("");
  const [type, setType] = useState<"SELECT" | "ASSIST">("SELECT");
  const [direction, setDirection] = useState<"EN_TO_VI" | "VI_TO_EN">(
    "EN_TO_VI"
  );
  const [lessonId, setLessonId] = useState("");
  const [order, setOrder] = useState(1);
  const [vocabularyItemId, setVocabularyItemId] = useState("");
  const createMutation = useCreateChallenge();
  const updateMutation = useUpdateChallenge(activeId);
  const deleteMutation = useDeleteChallenge();
  const formSubmitting = createMutation.isPending || updateMutation.isPending;

  const handleOpenCreate = () => {
    setIsEdit(false);
    setActiveId(null);
    setQuestion("");
    setType("SELECT");
    setDirection("EN_TO_VI");
    setLessonId(lessons[0]?.id?.toString() || "");
    setOrder(1);
    setVocabularyItemId("");
    setIsOpen(true);
  };
  const handleOpenEdit = (c: Challenge) => {
    setIsEdit(true);
    setActiveId(c.id);
    setQuestion(c.question);
    setType(c.type);
    setDirection(c.direction || "EN_TO_VI");
    setLessonId(c.lessonId.toString());
    setOrder(c.order);
    setVocabularyItemId(
      c.vocabularyItemId ? c.vocabularyItemId.toString() : ""
    );
    setIsOpen(true);
  };
  const handleDelete = async (id: number) => {
    if (!confirm("Xóa câu hỏi này?")) return;
    try {
      await deleteMutation.mutateAsync(id);
      toast.success("Xóa thành công");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Lỗi");
    }
  };
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const body = {
        question,
        type,
        direction: type === "SELECT" ? direction : null,
        lessonId: parseInt(lessonId),
        order,
        vocabularyItemId: vocabularyItemId ? parseInt(vocabularyItemId) : null,
      };
      if (isEdit && activeId !== null) await updateMutation.mutateAsync(body);
      else await createMutation.mutateAsync(body);
      toast.success(isEdit ? "Cập nhật thành công" : "Tạo thành công");
      setIsOpen(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Lỗi");
    }
  };

  const columns: Column<Challenge>[] = [
    {
      header: "ID",
      className: "w-16",
      cell: (i) => (
        <span className="text-xs font-semibold text-zinc-400">#{i.id}</span>
      ),
    },
    {
      header: "Câu hỏi",
      cell: (i) => (
        <span className="block max-w-sm truncate font-bold text-zinc-900">
          {i.question}
        </span>
      ),
    },
    {
      header: "Loại",
      cell: (i) => (
        <span
          className={`rounded-full border px-2 py-0.5 text-xs font-bold ${i.type === "SELECT" ? "border-blue-100 bg-blue-50 text-blue-600" : "border-amber-100 bg-amber-50 text-amber-600"}`}
        >
          {i.type}
        </span>
      ),
    },
    {
      header: "Hướng",
      cell: (i) => (
        <span className="text-xs font-semibold text-zinc-500">
          {i.direction || "-"}
        </span>
      ),
    },
    {
      header: "Bài học",
      cell: (i) => (
        <span className="text-sm text-zinc-700">
          {i.lessons?.title || `ID: ${i.lessonId}`}
        </span>
      ),
    },
    {
      header: "Thứ tự",
      className: "w-16 text-center",
      cell: (i) => <span className="font-bold text-zinc-900">{i.order}</span>,
    },
    {
      header: "Hành động",
      className: "text-right",
      cell: (i) => (
        <div className="flex items-center justify-end gap-1">
          <Button
            size="icon"
            variant="ghost"
            onClick={() => handleOpenEdit(i)}
            className="h-8 w-8 cursor-pointer rounded-lg text-zinc-400 hover:bg-zinc-100 hover:text-zinc-900"
          >
            <Edit2 className="h-3.5 w-3.5" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            onClick={() => handleDelete(i.id)}
            className="h-8 w-8 cursor-pointer rounded-lg text-zinc-400 hover:bg-red-50 hover:text-red-600"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 p-4 md:p-6">
      <div className="flex items-center justify-between border-b border-zinc-200 pb-4">
        <div>
          <h3 className="text-lg font-bold tracking-tight text-zinc-900">
            Danh sách câu hỏi thử thách
          </h3>
          <p className="mt-0.5 text-xs font-medium text-zinc-500">
            Tạo và cấu hình các thử thách (SELECT / ASSIST) cho bài học
          </p>
        </div>
        <Button
          onClick={handleOpenCreate}
          className="h-9 cursor-pointer gap-2 rounded-lg bg-zinc-900 px-4 font-medium text-zinc-50 hover:bg-zinc-800"
        >
          <Plus className="h-4 w-4" /> Thêm bản ghi mới
        </Button>
      </div>

      <DataTableCard<Challenge>
        data={challenges}
        columns={columns}
        isLoading={challengesQuery.isLoading}
        isFetching={challengesQuery.isFetching}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Tìm kiếm câu hỏi..."
        emptyMessage="Không tìm thấy bản ghi nào."
        currentPage={currentPage}
        pageSize={pageSize}
        totalItems={pagination?.total ?? 0}
        totalPages={pagination?.totalPages ?? 1}
        onPageChange={setCurrentPage}
        onPageSizeChange={setPageSize}
      />

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-lg rounded-xl border-zinc-200 bg-white p-6 text-zinc-900 shadow-lg">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold tracking-tight">
              {isEdit ? "Chỉnh sửa thử thách" : "Tạo thử thách mới"}
            </DialogTitle>
            <DialogDescription className="text-xs text-zinc-500">
              Nhập thông tin câu hỏi thử thách
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-zinc-700">
                Câu hỏi
              </Label>
              <Input
                required
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="Ví dụ: Chọn từ có nghĩa là 'Quả Táo'"
                className="border-zinc-200 bg-white"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-zinc-700">
                  Loại thử thách
                </Label>
                <Select
                  value={type}
                  onValueChange={(v) => setType(v as "SELECT" | "ASSIST")}
                >
                  <SelectTrigger className="border-zinc-200 bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SELECT">SELECT (Trắc nghiệm)</SelectItem>
                    <SelectItem value="ASSIST">
                      ASSIST (Điền/Sắp xếp)
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-zinc-700">
                  Hướng ngôn ngữ
                </Label>
                <Select
                  value={direction}
                  onValueChange={(v) =>
                    setDirection(v as "EN_TO_VI" | "VI_TO_EN")
                  }
                >
                  <SelectTrigger className="border-zinc-200 bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="EN_TO_VI">EN → VI</SelectItem>
                    <SelectItem value="VI_TO_EN">VI → EN</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-zinc-700">
                  Bài học
                </Label>
                <Select value={lessonId} onValueChange={setLessonId}>
                  <SelectTrigger className="border-zinc-200 bg-white">
                    <SelectValue placeholder="Chọn bài học" />
                  </SelectTrigger>
                  <SelectContent>
                    {lessons.map((l) => (
                      <SelectItem key={l.id} value={l.id.toString()}>
                        {l.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-zinc-700">
                  Thứ tự
                </Label>
                <Input
                  type="number"
                  min={1}
                  value={order}
                  onChange={(e) => setOrder(parseInt(e.target.value) || 1)}
                  className="border-zinc-200 bg-white"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-zinc-700">
                Vocabulary Item ID (Tùy chọn)
              </Label>
              <Input
                type="number"
                value={vocabularyItemId}
                onChange={(e) => setVocabularyItemId(e.target.value)}
                placeholder="ID từ vựng tương ứng"
                className="border-zinc-200 bg-white"
              />
            </div>
            <div className="flex items-center justify-end gap-3 border-t border-zinc-100 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsOpen(false)}
                className="cursor-pointer"
              >
                Hủy
              </Button>
              <Button
                type="submit"
                disabled={formSubmitting}
                className="cursor-pointer bg-zinc-900 text-zinc-50 hover:bg-zinc-800"
              >
                {formSubmitting ? (
                  <span className="flex items-center gap-1.5">
                    <Loader2 className="h-4 w-4 animate-spin" /> Đang lưu...
                  </span>
                ) : (
                  "Lưu thay đổi"
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
