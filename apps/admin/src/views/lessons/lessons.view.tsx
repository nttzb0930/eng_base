"use client";

import React, { useMemo, useState } from "react";
import { Plus, Edit2, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";

import type { Lesson } from "@/src/services/lessons/lessons.service";
import { useTableControls } from "@/src/hooks/use-table-controls";
import { useDebounce } from "@/src/hooks/use-debounce";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DataTableCard, type Column } from "@/src/components/data-table";
import { useAllUnits } from "../units/hooks/use-units";
import { useCreateLesson, useDeleteLesson, useLessons, useUpdateLesson } from "./hooks/use-lessons";

export function LessonsView() {
  const { currentPage, setCurrentPage, pageSize, setPageSize, searchQuery, setSearchQuery } = useTableControls();
  const debouncedSearch = useDebounce(searchQuery, 450);
  const lessonsQuery = useLessons({ page: currentPage, limit: pageSize, search: debouncedSearch });
  const unitsQuery = useAllUnits();
  const lessons = lessonsQuery.data?.data ?? [];
  const units = unitsQuery.data ?? [];
  const pagination = lessonsQuery.data?.pagination;

  const [isOpen, setIsOpen] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [title, setTitle] = useState("");
  const [unitId, setUnitId] = useState("");
  const [order, setOrder] = useState(1);
  const createMutation = useCreateLesson();
  const updateMutation = useUpdateLesson(activeId);
  const deleteMutation = useDeleteLesson();
  const formSubmitting = createMutation.isPending || updateMutation.isPending;

  const handleOpenCreate = () => { setIsEdit(false); setActiveId(null); setTitle(""); setUnitId(units[0]?.id?.toString() || ""); setOrder(1); setIsOpen(true); };
  const handleOpenEdit = (l: Lesson) => { setIsEdit(true); setActiveId(l.id); setTitle(l.title); setUnitId(l.unitId.toString()); setOrder(l.order); setIsOpen(true); };
  const handleDelete = async (id: number) => {
    if (!confirm("Xóa bài học này?")) return;
    try { await deleteMutation.mutateAsync(id); toast.success("Xóa thành công"); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Lỗi"); }
  };
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const body = { title, unitId: parseInt(unitId), order };
      if (isEdit && activeId !== null) await updateMutation.mutateAsync(body);
      else await createMutation.mutateAsync(body);
      toast.success(isEdit ? "Cập nhật thành công" : "Tạo thành công");
      setIsOpen(false);
    } catch (e) { toast.error(e instanceof Error ? e.message : "Lỗi"); }
  };

  const columns = useMemo<Column<Lesson>[]>(() => [
    { header: "ID", className: "w-16", cell: (i) => <span className="text-zinc-400 text-xs font-semibold">#{i.id}</span> },
    { header: "Tiêu đề bài học", accessorKey: "title", cell: (i) => <span className="font-bold text-zinc-900">{i.title}</span> },
    { header: "Chương học", cell: (i) => <span className="text-zinc-700 text-sm">{i.units?.title || `ID: ${i.unitId}`}</span> },
    { header: "Thứ tự", className: "w-20 text-center", cell: (i) => <span className="font-bold text-zinc-900">{i.order}</span> },
    {
      header: "Hành động", className: "text-right",
      cell: (i) => (
        <div className="flex items-center justify-end gap-1">
          <Button size="icon" variant="ghost" onClick={() => handleOpenEdit(i)} className="h-8 w-8 text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 rounded-lg cursor-pointer"><Edit2 className="h-3.5 w-3.5" /></Button>
          <Button size="icon" variant="ghost" onClick={() => handleDelete(i.id)} className="h-8 w-8 text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded-lg cursor-pointer"><Trash2 className="h-3.5 w-3.5" /></Button>
        </div>
      ),
    },
  ], []);

  return (
    <div className="max-w-7xl w-full mx-auto p-4 md:p-6 space-y-6">
      <div className="flex items-center justify-between border-b border-zinc-200 pb-4">
        <div>
          <h3 className="text-lg font-bold text-zinc-900 tracking-tight">Danh sách bài học (Lessons)</h3>
          <p className="text-xs text-zinc-500 mt-0.5 font-medium">Quản lý các bài học bên trong mỗi chương</p>
        </div>
        <Button onClick={handleOpenCreate} className="bg-zinc-900 hover:bg-zinc-800 text-zinc-50 font-medium rounded-lg h-9 px-4 gap-2 cursor-pointer"><Plus className="h-4 w-4" /> Thêm bản ghi mới</Button>
      </div>

      <DataTableCard<Lesson>
        data={lessons} columns={columns}
        isLoading={lessonsQuery.isLoading} isFetching={lessonsQuery.isFetching}
        searchQuery={searchQuery} onSearchChange={setSearchQuery} searchPlaceholder="Tìm kiếm bài học..."
        emptyMessage="Không tìm thấy bản ghi nào."
        currentPage={currentPage} pageSize={pageSize}
        totalItems={pagination?.total ?? 0} totalPages={pagination?.totalPages ?? 1}
        onPageChange={setCurrentPage} onPageSizeChange={setPageSize}
      />

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="bg-white text-zinc-900 border-zinc-200 max-w-lg p-6 rounded-xl shadow-lg">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold tracking-tight">{isEdit ? "Chỉnh sửa bài học" : "Tạo bài học mới"}</DialogTitle>
            <DialogDescription className="text-zinc-500 text-xs">Nhập chi tiết bài học bên dưới</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label className="text-zinc-700 font-semibold text-sm">Tiêu đề bài học</Label>
              <Input required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Nhập tiêu đề bài học" className="bg-white border-zinc-200" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-zinc-700 font-semibold text-sm">Chương học</Label>
                <Select value={unitId} onValueChange={setUnitId}>
                  <SelectTrigger className="bg-white border-zinc-200"><SelectValue placeholder="Chọn chương học" /></SelectTrigger>
                  <SelectContent>{units.map((u) => <SelectItem key={u.id} value={u.id.toString()}>{u.title}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-zinc-700 font-semibold text-sm">Thứ tự</Label>
                <Input type="number" min={1} value={order} onChange={(e) => setOrder(parseInt(e.target.value) || 1)} className="bg-white border-zinc-200" />
              </div>
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
