"use client";

import { BarChart3, CheckCircle2, XCircle } from "lucide-react";

import { EmptyState } from "@/app/components/feedback/EmptyState";
import { ErrorState } from "@/app/components/feedback/ErrorState";
import { LoadingState } from "@/app/components/feedback/LoadingState";
import { Badge } from "@/app/components/ui/badge";
import { Button } from "@/app/components/ui/button";
import { Card, CardContent } from "@/app/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/app/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/app/components/ui/table";
import { usePracticeSessionDetails } from "@/app/features/practice/hooks/use-practice-sessions";

export function PracticeSessionDetailDialog({
  onClose,
  sessionId,
}: {
  onClose(): void;
  sessionId: number;
}) {
  const query = usePracticeSessionDetails(sessionId, true);
  const session = query.data;

  return (
    <Dialog onOpenChange={(open) => !open && onClose()} open>
      <DialogContent className="max-h-[calc(100vh-2rem)] overflow-y-auto sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>Chi tiết phiên luyện tập</DialogTitle>
          <DialogDescription>
            Báo cáo kết quả từng câu trả lời trong phiên tự học.
          </DialogDescription>
        </DialogHeader>
        {query.isError ? (
          <ErrorState
            description="Không thể tải chi tiết phiên luyện tập."
            onRetry={() => void query.refetch()}
          />
        ) : query.isLoading || !session ? (
          <LoadingState label="Đang tải chi tiết phiên" rows={3} />
        ) : (
          <div className="space-y-6">
            <div className="grid gap-3 sm:grid-cols-3">
              {[
                { label: "Chế độ học", value: session.mode },
                {
                  label: "Kết quả",
                  value: `${session.correctCount} đúng · ${session.wrongCount} sai`,
                },
                { label: "Độ chính xác", value: `${session.accuracy}%` },
              ].map((metric) => (
                <Card className="py-0 shadow-none" key={metric.label}>
                  <CardContent className="p-4">
                    <p className="text-xs text-muted-foreground">{metric.label}</p>
                    <p className="mt-1 text-lg font-semibold capitalize tabular-nums">
                      {metric.value}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
            <section className="space-y-3">
              <h3 className="flex items-center gap-2 text-sm font-semibold">
                <BarChart3 aria-hidden="true" className="size-4" />
                Danh sách câu hỏi luyện tập
              </h3>
              <div className="max-h-[45vh] overflow-auto rounded-lg border">
                <Table>
                  <TableHeader className="sticky top-0 z-10 bg-background">
                    <TableRow>
                      <TableHead>Dạng câu hỏi</TableHead>
                      <TableHead>Từ vựng</TableHead>
                      <TableHead>Nghĩa tiếng Việt</TableHead>
                      <TableHead>Đáp án</TableHead>
                      <TableHead>Kết quả</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {session.items?.length ? (
                      session.items.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell className="font-mono text-xs text-muted-foreground">
                            {item.challengeType}
                          </TableCell>
                          <TableCell className="font-medium">
                            {item.vocabularyItem?.word ?? "—"}
                          </TableCell>
                          <TableCell className="max-w-48 truncate text-xs text-muted-foreground">
                            {item.vocabularyItem?.primaryMeaningVi ?? "—"}
                          </TableCell>
                          <TableCell className="text-xs italic text-muted-foreground">
                            {item.answer ?? "—"}
                          </TableCell>
                          <TableCell>
                            <Badge variant={item.correct ? "secondary" : "destructive"}>
                              {item.correct ? (
                                <CheckCircle2 aria-hidden="true" />
                              ) : (
                                <XCircle aria-hidden="true" />
                              )}
                              {item.correct ? "Đúng" : "Sai"}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={5}>
                          <EmptyState
                            description="Phiên này không có câu trả lời được ghi lại."
                            title="Không có dữ liệu câu trả lời"
                          />
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </section>
          </div>
        )}
        <div className="flex justify-end border-t pt-4">
          <Button onClick={onClose}>Đóng</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
