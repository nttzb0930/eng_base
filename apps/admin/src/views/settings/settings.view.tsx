"use client";

import React, { useEffect, useState, useTransition } from "react";
import { Sliders, Save, Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { settingsService } from "@/src/services/settings/settings.service";

export function SettingsView() {
  const [maxHearts, setMaxHearts] = useState("5");
  const [isLoading, setIsLoading] = useState(true);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    async function loadSetting() {
      try {
        const val = await settingsService.getSetting("MAX_HEARTS");
        if (val) {
          setMaxHearts(val);
        }
      } catch (error) {
        toast.error("Không thể tải cấu hình từ máy chủ");
      } finally {
        setIsLoading(false);
      }
    }
    loadSetting();
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const valInt = parseInt(maxHearts, 10);
    if (isNaN(valInt) || valInt < 1) {
      toast.error("Số lượt làm bài sai phải là số nguyên lớn hơn hoặc bằng 1.");
      return;
    }

    startTransition(async () => {
      try {
        await settingsService.updateSetting("MAX_HEARTS", maxHearts);
        toast.success("Đã lưu cấu hình hệ thống thành công!");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Không thể cập nhật cấu hình");
      }
    });
  };

  if (isLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-zinc-500" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl w-full mx-auto p-4 md:p-6 space-y-6">
      {/* HEADER */}
      <div className="flex items-center justify-between border-b border-zinc-200 pb-4">
        <div>
          <h3 className="text-lg font-bold text-zinc-900 tracking-tight">Cấu hình hệ thống (Settings)</h3>
          <p className="text-xs text-zinc-500 mt-0.5 font-medium">Thiết lập các thông số hoạt động và luật chơi toàn hệ thống</p>
        </div>
      </div>

      <Card className="border-zinc-200 bg-white shadow-sm max-w-2xl">
        <CardHeader className="border-b border-zinc-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-900 text-zinc-50 border border-zinc-950 shadow-inner shrink-0">
              <Sliders className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-base font-bold text-zinc-900">Thông số bài học</CardTitle>
              <CardDescription className="text-xs text-zinc-500 font-medium">Thiết lập giới hạn học và cơ chế reset</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="maxHearts" className="text-zinc-800 font-semibold text-sm flex items-center gap-1.5">
                Số lượt làm sai tối đa (Max Hearts / Allowed Mistakes)
              </Label>
              <p className="text-xs text-zinc-400 font-medium leading-relaxed">
                Số lượng sinh mệnh/trái tim tối đa được cấp cho mỗi học viên khi bắt đầu bài học. Nếu trả lời sai quá số lần này, phiên học sẽ kết thúc và học viên phải làm lại từ đầu.
              </p>
              <div className="flex items-center gap-4 max-w-xs pt-1">
                <Input
                  id="maxHearts"
                  type="number"
                  required
                  min={1}
                  max={99}
                  value={maxHearts}
                  onChange={(e) => setMaxHearts(e.target.value)}
                  className="bg-white border-zinc-200 text-zinc-900 focus-visible:ring-zinc-400 font-bold text-base"
                />
                <span className="text-xs font-semibold text-zinc-400 shrink-0">lượt</span>
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-zinc-100 pt-6">
              <span className="flex items-center gap-1.5 text-emerald-600 text-xs font-semibold">
                <ShieldCheck className="h-4 w-4" /> Đã xác thực quản trị viên
              </span>
              <Button
                type="submit"
                disabled={isPending}
                className="bg-zinc-900 hover:bg-zinc-800 text-zinc-50 font-bold rounded-lg h-9 px-5 gap-2 cursor-pointer active:scale-95 transition-all shadow-sm"
              >
                {isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Đang lưu...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    Lưu cấu hình
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
