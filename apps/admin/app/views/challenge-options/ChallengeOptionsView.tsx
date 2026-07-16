"use client";

import React, { useState } from "react";
import Image from "next/image";
import {
  Plus,
  Edit2,
  Trash2,
  Loader2,
  Volume2,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";

import type { LessonChallengeOptionViewModel as ChallengeOption } from "@/app/features/courses/types/course-management.types";
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
import { useAllChallenges } from "@/app/features/courses/hooks/use-challenges";
import {
  useChallengeOptions,
  useCreateChallengeOption,
  useDeleteChallengeOption,
  useUpdateChallengeOption,
} from "@/app/features/courses/hooks/use-challenge-options";

export function ChallengeOptionsView() {
  const {
    currentPage,
    setCurrentPage,
    pageSize,
    setPageSize,
    searchQuery,
    setSearchQuery,
  } = useTableControls();
  const debouncedSearch = useDebounce(searchQuery, 450);
  const optionsQuery = useChallengeOptions({
    page: currentPage,
    limit: pageSize,
    search: debouncedSearch,
  });
  const challengesQuery = useAllChallenges();
  const options = optionsQuery.data?.data ?? [];
  const challenges = challengesQuery.data ?? [];
  const pagination = optionsQuery.data?.pagination;

  const [isOpen, setIsOpen] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [challengeId, setChallengeId] = useState("");
  const [text, setText] = useState("");
  const [correct, setCorrect] = useState("false");
  const [imageSrc, setImageSrc] = useState("");
  const [audioSrc, setAudioSrc] = useState("");
  const [playingAudioUrl, setPlayingAudioUrl] = useState<string | null>(null);

  const createMutation = useCreateChallengeOption();
  const updateMutation = useUpdateChallengeOption(activeId);
  const deleteMutation = useDeleteChallengeOption();
  const formSubmitting = createMutation.isPending || updateMutation.isPending;

  const playAudio = (url: string) => {
    const audio = new Audio(url);
    setPlayingAudioUrl(url);
    audio.play().catch(() => toast.error("Không thể phát âm thanh."));
    audio.onended = () => setPlayingAudioUrl(null);
  };

  const handleOpenCreate = () => {
    setIsEdit(false);
    setActiveId(null);
    setChallengeId(challenges[0]?.id?.toString() || "");
    setText("");
    setCorrect("false");
    setImageSrc("");
    setAudioSrc("");
    setIsOpen(true);
  };
  const handleOpenEdit = (o: ChallengeOption) => {
    setIsEdit(true);
    setActiveId(o.id);
    setChallengeId(o.challengeId.toString());
    setText(o.text);
    setCorrect(o.correct ? "true" : "false");
    setImageSrc(o.imageSrc || "");
    setAudioSrc(o.audioSrc || "");
    setIsOpen(true);
  };
  const handleDelete = async (id: number) => {
    if (!confirm("Xóa đáp án này?")) return;
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
        challengeId: parseInt(challengeId),
        text,
        correct: correct === "true",
        imageSrc: imageSrc.trim() || null,
        audioSrc: audioSrc.trim() || null,
      };
      if (isEdit && activeId !== null) await updateMutation.mutateAsync(body);
      else await createMutation.mutateAsync(body);
      toast.success(isEdit ? "Cập nhật thành công" : "Tạo thành công");
      setIsOpen(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Lỗi");
    }
  };

  const columns: Column<ChallengeOption>[] = [
    {
      header: "ID",
      className: "w-16",
      cell: (i) => (
        <span className="text-xs font-semibold text-zinc-400">#{i.id}</span>
      ),
    },
    {
      header: "Nội dung đáp án",
      cell: (i) => <span className="font-bold text-zinc-900">{i.text}</span>,
    },
    {
      header: "Phân loại",
      cell: (i) =>
        i.correct ? (
          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-100 bg-emerald-50 px-2 py-0.5 text-xs font-bold text-emerald-600">
            <CheckCircle2 className="h-3 w-3" /> Đúng
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 rounded-full border border-red-100 bg-red-50 px-2 py-0.5 text-xs font-bold text-red-600">
            <XCircle className="h-3 w-3" /> Sai
          </span>
        ),
    },
    {
      header: "Ảnh / Audio",
      cell: (i) => (
        <div className="flex items-center gap-2">
          {i.imageSrc && (
            <Image
              src={i.imageSrc}
              alt=""
              width={28}
              height={28}
              className="h-7 w-7 rounded border object-contain p-0.5"
            />
          )}
          {i.audioSrc && (
            <Button
              size="icon"
              variant="ghost"
              onClick={() => playAudio(i.audioSrc!)}
              className="h-7 w-7 cursor-pointer rounded-full text-zinc-400 hover:text-zinc-900"
            >
              <Volume2
                className={`h-3.5 w-3.5 ${playingAudioUrl === i.audioSrc ? "animate-pulse text-sky-600" : ""}`}
              />
            </Button>
          )}
          {!i.imageSrc && !i.audioSrc && (
            <span className="text-xs text-zinc-400">Trống</span>
          )}
        </div>
      ),
    },
    {
      header: "Câu hỏi",
      cell: (i) => (
        <span className="block max-w-xs truncate text-sm text-zinc-700">
          {i.challenges?.question || `ID: ${i.challengeId}`}
        </span>
      ),
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
            Đáp án thử thách (Challenge Options)
          </h3>
          <p className="mt-0.5 text-xs font-medium text-zinc-500">
            Cấu hình các đáp án lựa chọn của từng câu hỏi trắc nghiệm
          </p>
        </div>
        <Button
          onClick={handleOpenCreate}
          className="h-9 cursor-pointer gap-2 rounded-lg bg-zinc-900 px-4 font-medium text-zinc-50 hover:bg-zinc-800"
        >
          <Plus className="h-4 w-4" /> Thêm bản ghi mới
        </Button>
      </div>

      <DataTableCard<ChallengeOption>
        data={options}
        columns={columns}
        isLoading={optionsQuery.isLoading}
        isFetching={optionsQuery.isFetching}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Tìm kiếm đáp án..."
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
              {isEdit ? "Chỉnh sửa đáp án" : "Tạo đáp án mới"}
            </DialogTitle>
            <DialogDescription className="text-xs text-zinc-500">
              Nhập thông tin đáp án của câu hỏi trắc nghiệm
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-zinc-700">
                Nội dung đáp án
              </Label>
              <Input
                required
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Nhập nội dung đáp án"
                className="border-zinc-200 bg-white"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-zinc-700">
                  Câu hỏi thử thách
                </Label>
                <Select value={challengeId} onValueChange={setChallengeId}>
                  <SelectTrigger className="border-zinc-200 bg-white">
                    <SelectValue placeholder="Chọn câu hỏi" />
                  </SelectTrigger>
                  <SelectContent>
                    {challenges.map((c) => (
                      <SelectItem key={c.id} value={c.id.toString()}>
                        {c.question}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-zinc-700">
                  Đáp án
                </Label>
                <Select value={correct} onValueChange={setCorrect}>
                  <SelectTrigger className="border-zinc-200 bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="true">ĐÚNG (Correct)</SelectItem>
                    <SelectItem value="false">SAI (Incorrect)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-zinc-700">
                Ảnh (Tùy chọn)
              </Label>
              <Input
                value={imageSrc}
                onChange={(e) => setImageSrc(e.target.value)}
                placeholder="/apple.svg"
                className="border-zinc-200 bg-white"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-zinc-700">
                Audio (Tùy chọn)
              </Label>
              <Input
                value={audioSrc}
                onChange={(e) => setAudioSrc(e.target.value)}
                placeholder="/audio/apple.mp3"
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
