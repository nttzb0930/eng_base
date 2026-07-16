"use client";

import React, { useState } from "react";
import { Plus, Edit2, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";

import type { CourseViewModel as Course } from "@/app/features/courses/types/course-management.types";
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
import { DataTableCard, type Column } from "@/src/components/data-table";
import {
  useCourses,
  useCreateCourse,
  useDeleteCourse,
  useUpdateCourse,
} from "@/app/features/courses/hooks/use-courses";

export function CoursesView() {
  const {
    currentPage,
    setCurrentPage,
    pageSize,
    setPageSize,
    searchQuery,
    setSearchQuery,
  } = useTableControls();
  const debouncedSearch = useDebounce(searchQuery, 450);
  const coursesQuery = useCourses({
    page: currentPage,
    limit: pageSize,
    search: debouncedSearch,
  });
  const courses = coursesQuery.data?.data ?? [];
  const pagination = coursesQuery.data?.pagination;

  const [isOpen, setIsOpen] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [title, setTitle] = useState("");
  const [imageSrc, setImageSrc] = useState("");
  const createMutation = useCreateCourse();
  const updateMutation = useUpdateCourse(activeId);
  const deleteMutation = useDeleteCourse();
  const formSubmitting = createMutation.isPending || updateMutation.isPending;

  const handleOpenCreate = () => {
    setIsEdit(false);
    setActiveId(null);
    setTitle("");
    setImageSrc("");
    setIsOpen(true);
  };
  const handleOpenEdit = (c: Course) => {
    setIsEdit(true);
    setActiveId(c.id);
    setTitle(c.title);
    setImageSrc(c.imageSrc);
    setIsOpen(true);
  };
  const handleDelete = async (id: number) => {
    if (!confirm("Bạn có chắc chắn muốn xóa khóa học này?")) return;
    try {
      await deleteMutation.mutateAsync(id);
      toast.success("Xóa khóa học thành công");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Thao tác thất bại");
    }
  };
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !imageSrc.trim()) {
      toast.error("Vui lòng điền đầy đủ thông tin");
      return;
    }
    try {
      if (isEdit && activeId !== null) {
        await updateMutation.mutateAsync({ title, imageSrc });
      } else {
        await createMutation.mutateAsync({ title, imageSrc });
      }
      toast.success(isEdit ? "Cập nhật thành công" : "Tạo khóa học thành công");
      setIsOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Thao tác thất bại");
    }
  };

  const columns: Column<Course>[] = [
    {
      header: "ID",
      accessorKey: "id",
      className: "w-16",
      cell: (item) => (
        <span className="text-xs font-semibold text-zinc-400">#{item.id}</span>
      ),
    },
    {
      header: "Tiêu đề khóa học",
      accessorKey: "title",
      cell: (item) => (
        <span className="font-bold text-zinc-900">{item.title}</span>
      ),
    },
    {
      header: "Ảnh biểu tượng",
      accessorKey: "imageSrc",
      cell: (item) => (
        <span className="font-mono text-xs text-zinc-400">{item.imageSrc}</span>
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
            onClick={() => handleOpenEdit(item)}
            className="h-8 w-8 cursor-pointer rounded-lg text-zinc-400 hover:bg-zinc-100 hover:text-zinc-900"
          >
            <Edit2 className="h-3.5 w-3.5" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            onClick={() => handleDelete(item.id)}
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
            Danh sách khóa học
          </h3>
          <p className="mt-0.5 text-xs font-medium text-zinc-500">
            Xem và chỉnh sửa dữ liệu hiển thị trên thiết bị người dùng
          </p>
        </div>
        <Button
          onClick={handleOpenCreate}
          className="h-9 cursor-pointer gap-2 rounded-lg bg-zinc-900 px-4 font-medium text-zinc-50 hover:bg-zinc-800"
        >
          <Plus className="h-4 w-4" /> Thêm bản ghi mới
        </Button>
      </div>

      <DataTableCard<Course>
        data={courses}
        columns={columns}
        isLoading={coursesQuery.isLoading}
        isFetching={coursesQuery.isFetching}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Tìm kiếm khóa học..."
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
              {isEdit ? "Chỉnh sửa bản ghi" : "Tạo bản ghi mới"}
            </DialogTitle>
            <DialogDescription className="text-xs font-medium text-zinc-500">
              Nhập thông tin khóa học mới bên dưới
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-zinc-700">
                Tiêu đề khóa học
              </Label>
              <Input
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Nhập tiêu đề khóa học"
                className="border-zinc-200 bg-white text-zinc-900 focus-visible:ring-zinc-400"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-zinc-700">
                Ảnh biểu tượng (imageSrc)
              </Label>
              <Input
                required
                value={imageSrc}
                onChange={(e) => setImageSrc(e.target.value)}
                placeholder="Ví dụ: /es.svg"
                className="border-zinc-200 bg-white text-zinc-900 focus-visible:ring-zinc-400"
              />
            </div>
            <div className="flex items-center justify-end gap-3 border-t border-zinc-100 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsOpen(false)}
                className="h-9 cursor-pointer rounded-lg border-zinc-200 px-4 font-semibold text-zinc-700 hover:bg-zinc-50"
              >
                Hủy
              </Button>
              <Button
                type="submit"
                disabled={formSubmitting}
                className="h-9 cursor-pointer rounded-lg bg-zinc-900 px-4 font-semibold text-zinc-50 hover:bg-zinc-800"
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
