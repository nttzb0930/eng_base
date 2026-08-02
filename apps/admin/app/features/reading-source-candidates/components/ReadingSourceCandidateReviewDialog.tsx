"use client";

import { ErrorState } from "@/app/components/feedback/ErrorState";
import { LoadingState } from "@/app/components/feedback/LoadingState";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/app/components/ui/dialog";
import { useReadingTopicOptions } from "@/app/features/reading/hooks/use-reading-passages";
import {
  useConvertReadingSourceCandidate,
  useReadingSourceCandidate,
  useRejectReadingSourceCandidate,
} from "@/app/features/reading-source-candidates/hooks/use-reading-source-candidates";

import { ReadingSourceCandidateEditor } from "./ReadingSourceCandidateEditor";

export function ReadingSourceCandidateReviewDialog({
  candidateId,
  onClose,
}: {
  candidateId: number | null;
  onClose(): void;
}) {
  const query = useReadingSourceCandidate(candidateId);
  const topics = useReadingTopicOptions();
  const convert = useConvertReadingSourceCandidate(candidateId);
  const reject = useRejectReadingSourceCandidate(candidateId);

  return (
    <Dialog onOpenChange={(open) => !open && onClose()} open={candidateId !== null}>
      <DialogContent className="max-h-[calc(100vh-2rem)] overflow-y-auto sm:max-w-6xl">
        <DialogHeader>
          <DialogTitle>Kiểm duyệt Reading candidate</DialogTitle>
          <DialogDescription>
            HTML nguồn chỉ hiển thị dạng text; chỉnh bản nháp trước khi chuyển
            đổi.
          </DialogDescription>
        </DialogHeader>
        {query.isError ? (
          <ErrorState
            description="Không thể tải candidate."
            onRetry={() => void query.refetch()}
          />
        ) : query.isLoading || !query.data ? (
          <LoadingState label="Đang tải candidate" rows={2} />
        ) : (
          <ReadingSourceCandidateEditor
            candidate={query.data}
            converting={convert.isPending}
            key={query.data.id}
            onClose={onClose}
            onConvert={(payload) => convert.mutateAsync(payload)}
            onReject={(reason) => reject.mutateAsync({ reason })}
            rejecting={reject.isPending}
            topics={topics.data ?? []}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
