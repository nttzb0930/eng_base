"use client";

import React, { useState } from "react";
import { Plus, Edit2, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";

import type { CourseUnitViewModel as Unit } from "../model/course-management.view-model";
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
import { useAllCourses } from "../catalog";
import {
  useCreateUnit,
  useDeleteUnit,
  useUnits,
  useUpdateUnit,
} from "./unit.queries";

export function UnitsView() {
  const {
    currentPage,
    setCurrentPage,
    pageSize,
    setPageSize,
    searchQuery,
    setSearchQuery,
  } = useTableControls();
  const debouncedSearch = useDebounce(searchQuery, 450);
  const unitsQuery = useUnits({
    page: currentPage,
    limit: pageSize,
    search: debouncedSearch,
  });
  const coursesQuery = useAllCourses();
  const units = unitsQuery.data?.data ?? [];
  const courses = coursesQuery.data ?? [];
  const pagination = unitsQuery.data?.pagination;

  const [isOpen, setIsOpen] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [courseId, setCourseId] = useState("");
  const [order, setOrder] = useState(1);
  const createMutation = useCreateUnit();
  const updateMutation = useUpdateUnit(activeId);
  const deleteMutation = useDeleteUnit();
  const formSubmitting = createMutation.isPending || updateMutation.isPending;

  const handleOpenCreate = () => {
    setIsEdit(false);
    setActiveId(null);
    setTitle("");
    setDescription("");
    setCourseId(courses[0]?.id?.toString() || "");
    setOrder(1);
    setIsOpen(true);
  };
  const handleOpenEdit = (u: Unit) => {
    setIsEdit(true);
    setActiveId(u.id);
    setTitle(u.title);
    setDescription(u.description);
    setCourseId(u.courseId.toString());
    setOrder(u.order);
    setIsOpen(true);
  };
  const handleDelete = async (id: number) => {
    if (!confirm("Xóa chương học này?")) return;
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
      const body = { title, description, courseId: parseInt(courseId), order };
      if (isEdit && activeId !== null) await updateMutation.mutateAsync(body);
      else await createMutation.mutateAsync(body);
      toast.success(isEdit ? "Cập nhật thành công" : "Tạo thành công");
      setIsOpen(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Lỗi");
    }
  };

  const columns: Column<Unit>[] = [
    {
      header: "ID",
      className: "w-16",
      cell: (i) => (
        <span className="text-xs font-semibold text-zinc-400">#{i.id}</span>
      ),
    },
    {
      header: "Tiêu đề chương",
      accessorKey: "title",
      cell: (i) => <span className="font-bold text-zinc-900">{i.title}</span>,
    },
    {
      header: "Mô tả",
      cell: (i) => (
        <span className="block max-w-xs truncate text-xs text-zinc-500">
          {i.description}
        </span>
      ),
    },
    {
      header: "Khóa học",
      cell: (i) => (
        <span className="text-sm text-zinc-700">
          {i.courses?.title || `ID: ${i.courseId}`}
        </span>
      ),
    },
    {
      header: "Thứ tự",
      className: "w-20 text-center",
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
            Danh sách chương học (Units)
          </h3>
          <p className="mt-0.5 text-xs font-medium text-zinc-500">
            Cấu hình thứ tự và mô tả của các chương học
          </p>
        </div>
        <Button
          onClick={handleOpenCreate}
          className="h-9 cursor-pointer gap-2 rounded-lg bg-zinc-900 px-4 font-medium text-zinc-50 hover:bg-zinc-800"
        >
          <Plus className="h-4 w-4" /> Thêm bản ghi mới
        </Button>
      </div>

      <DataTableCard<Unit>
        data={units}
        columns={columns}
        isLoading={unitsQuery.isLoading}
        isFetching={unitsQuery.isFetching}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Tìm kiếm chương học..."
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
              {isEdit ? "Chỉnh sửa chương học" : "Tạo chương học mới"}
            </DialogTitle>
            <DialogDescription className="text-xs text-zinc-500">
              Nhập chi tiết chương học bên dưới
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-zinc-700">
                Tiêu đề
              </Label>
              <Input
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Unit 1: Cơ bản"
                className="border-zinc-200 bg-white"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-zinc-700">
                Mô tả
              </Label>
              <Input
                required
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Mô tả chương học"
                className="border-zinc-200 bg-white"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-zinc-700">
                  Khóa học
                </Label>
                <Select value={courseId} onValueChange={setCourseId}>
                  <SelectTrigger className="border-zinc-200 bg-white">
                    <SelectValue placeholder="Chọn khóa học" />
                  </SelectTrigger>
                  <SelectContent>
                    {courses.map((c) => (
                      <SelectItem key={c.id} value={c.id.toString()}>
                        {c.title}
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
