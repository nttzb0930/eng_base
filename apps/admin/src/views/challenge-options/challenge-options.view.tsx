"use client";

import React, { useMemo, useState } from "react";
import Image from "next/image";
import { Plus, Edit2, Trash2, Loader2, Volume2, CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";

import type { ChallengeOption } from "@/src/services/challenge-options/challenge-options.service";
import { useTableControls } from "@/src/hooks/use-table-controls";
import { useDebounce } from "@/src/hooks/use-debounce";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DataTableCard, type Column } from "@/src/components/data-table";
import { useAllChallenges } from "../challenges/hooks/use-challenges";
import { useChallengeOptions, useCreateChallengeOption, useDeleteChallengeOption, useUpdateChallengeOption } from "./hooks/use-challenge-options";

export function ChallengeOptionsView() {
  const { currentPage, setCurrentPage, pageSize, setPageSize, searchQuery, setSearchQuery } = useTableControls();
  const debouncedSearch = useDebounce(searchQuery, 450);
  const optionsQuery = useChallengeOptions({ page: currentPage, limit: pageSize, search: debouncedSearch });
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
    setIsEdit(false); setActiveId(null); setChallengeId(challenges[0]?.id?.toString() || "");
    setText(""); setCorrect("false"); setImageSrc(""); setAudioSrc(""); setIsOpen(true);
  };
  const handleOpenEdit = (o: ChallengeOption) => {
    setIsEdit(true); setActiveId(o.id); setChallengeId(o.challengeId.toString()); setText(o.text);
    setCorrect(o.correct ? "true" : "false"); setImageSrc(o.imageSrc || ""); setAudioSrc(o.audioSrc || ""); setIsOpen(true);
  };
  const handleDelete = async (id: number) => {
    if (!confirm("Xóa đáp án này?")) return;
    try { await deleteMutation.mutateAsync(id); toast.success("Xóa thành công"); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Lỗi"); }
  };
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const body = { challengeId: parseInt(challengeId), text, correct: correct === "true", imageSrc: imageSrc.trim() || null, audioSrc: audioSrc.trim() || null };
      if (isEdit && activeId !== null) await updateMutation.mutateAsync(body);
      else await createMutation.mutateAsync(body);
      toast.success(isEdit ? "Cập nhật thành công" : "Tạo thành công");
      setIsOpen(false);
    } catch (e) { toast.error(e instanceof Error ? e.message : "Lỗi"); }
  };

  const columns = useMemo<Column<ChallengeOption>[]>(() => [
    { header: "ID", className: "w-16", cell: (i) => <span className="text-zinc-400 text-xs font-semibold">#{i.id}</span> },
    { header: "Nội dung đáp án", cell: (i) => <span className="font-bold text-zinc-900">{i.text}</span> },
    {
      header: "Phân loại", cell: (i) => i.correct ? (
        <span className="inline-flex items-center gap-1 text-emerald-600 text-xs font-bold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100"><CheckCircle2 className="h-3 w-3" /> Đúng</span>
      ) : (
        <span className="inline-flex items-center gap-1 text-red-600 text-xs font-bold bg-red-50 px-2 py-0.5 rounded-full border border-red-100"><XCircle className="h-3 w-3" /> Sai</span>
      ),
    },
    {
      header: "Ảnh / Audio", cell: (i) => (
        <div className="flex items-center gap-2">
          {i.imageSrc && <Image src={i.imageSrc} alt="" width={28} height={28} className="h-7 w-7 object-contain border rounded p-0.5" />}
          {i.audioSrc && (
            <Button size="icon" variant="ghost" onClick={() => playAudio(i.audioSrc!)} className="h-7 w-7 text-zinc-400 hover:text-zinc-900 rounded-full cursor-pointer">
              <Volume2 className={`h-3.5 w-3.5 ${playingAudioUrl === i.audioSrc ? "text-sky-600 animate-pulse" : ""}`} />
            </Button>
          )}
          {!i.imageSrc && !i.audioSrc && <span className="text-xs text-zinc-400">Trống</span>}
        </div>
      ),
    },
    { header: "Câu hỏi", cell: (i) => <span className="text-zinc-700 text-sm truncate max-w-xs block">{i.challenges?.question || `ID: ${i.challengeId}`}</span> },
    {
      header: "Hành động", className: "text-right",
      cell: (i) => (
        <div className="flex items-center justify-end gap-1">
          <Button size="icon" variant="ghost" onClick={() => handleOpenEdit(i)} className="h-8 w-8 text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 rounded-lg cursor-pointer"><Edit2 className="h-3.5 w-3.5" /></Button>
          <Button size="icon" variant="ghost" onClick={() => handleDelete(i.id)} className="h-8 w-8 text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded-lg cursor-pointer"><Trash2 className="h-3.5 w-3.5" /></Button>
        </div>
      ),
    },
  ], [playingAudioUrl]);

  return (
    <div className="max-w-7xl w-full mx-auto p-4 md:p-6 space-y-6">
      <div className="flex items-center justify-between border-b border-zinc-200 pb-4">
        <div>
          <h3 className="text-lg font-bold text-zinc-900 tracking-tight">Đáp án thử thách (Challenge Options)</h3>
          <p className="text-xs text-zinc-500 mt-0.5 font-medium">Cấu hình các đáp án lựa chọn của từng câu hỏi trắc nghiệm</p>
        </div>
        <Button onClick={handleOpenCreate} className="bg-zinc-900 hover:bg-zinc-800 text-zinc-50 font-medium rounded-lg h-9 px-4 gap-2 cursor-pointer"><Plus className="h-4 w-4" /> Thêm bản ghi mới</Button>
      </div>

      <DataTableCard<ChallengeOption>
        data={options} columns={columns}
        isLoading={optionsQuery.isLoading} isFetching={optionsQuery.isFetching}
        searchQuery={searchQuery} onSearchChange={setSearchQuery} searchPlaceholder="Tìm kiếm đáp án..."
        emptyMessage="Không tìm thấy bản ghi nào."
        currentPage={currentPage} pageSize={pageSize}
        totalItems={pagination?.total ?? 0} totalPages={pagination?.totalPages ?? 1}
        onPageChange={setCurrentPage} onPageSizeChange={setPageSize}
      />

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="bg-white text-zinc-900 border-zinc-200 max-w-lg p-6 rounded-xl shadow-lg">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold tracking-tight">{isEdit ? "Chỉnh sửa đáp án" : "Tạo đáp án mới"}</DialogTitle>
            <DialogDescription className="text-zinc-500 text-xs">Nhập thông tin đáp án của câu hỏi trắc nghiệm</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label className="text-zinc-700 font-semibold text-sm">Nội dung đáp án</Label>
              <Input required value={text} onChange={(e) => setText(e.target.value)} placeholder="Nhập nội dung đáp án" className="bg-white border-zinc-200" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-zinc-700 font-semibold text-sm">Câu hỏi thử thách</Label>
                <Select value={challengeId} onValueChange={setChallengeId}>
                  <SelectTrigger className="bg-white border-zinc-200"><SelectValue placeholder="Chọn câu hỏi" /></SelectTrigger>
                  <SelectContent>{challenges.map((c) => <SelectItem key={c.id} value={c.id.toString()}>{c.question}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-zinc-700 font-semibold text-sm">Đáp án</Label>
                <Select value={correct} onValueChange={setCorrect}>
                  <SelectTrigger className="bg-white border-zinc-200"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="true">ĐÚNG (Correct)</SelectItem>
                    <SelectItem value="false">SAI (Incorrect)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-zinc-700 font-semibold text-sm">Ảnh (Tùy chọn)</Label>
              <Input value={imageSrc} onChange={(e) => setImageSrc(e.target.value)} placeholder="/apple.svg" className="bg-white border-zinc-200" />
            </div>
            <div className="space-y-2">
              <Label className="text-zinc-700 font-semibold text-sm">Audio (Tùy chọn)</Label>
              <Input value={audioSrc} onChange={(e) => setAudioSrc(e.target.value)} placeholder="/audio/apple.mp3" className="bg-white border-zinc-200" />
            </div>
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-100">
              <Button type="button" variant="outline" onClick={() => setIsOpen(false)} className="cursor-pointer">Hủy</Button>
              <Button type="submit" disabled={formSubmitting} className="bg-zinc-900 hover:bg-zinc-800 text-zinc-50 cursor-pointer">
                {formSubmitting ? <span className="flex items-center gap-1.5"><Loader2 className="h-4 w-4 animate-spin" /> Đang lưu...</span> : "Lưu thay đổi"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
