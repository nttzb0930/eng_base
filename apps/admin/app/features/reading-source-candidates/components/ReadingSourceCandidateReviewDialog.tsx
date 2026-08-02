"use client";

import {
  READING_CEFR_LEVELS,
  type AdminReadingSourceCandidateDetail,
  type ConvertReadingSourceCandidatePayload,
  type ReadingTopicOption,
} from "@repo/shared";
import { Check, ExternalLink, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";

import { ErrorState } from "@/app/components/feedback/ErrorState";
import { LoadingState } from "@/app/components/feedback/LoadingState";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/app/components/ui/alert-dialog";
import { Badge } from "@/app/components/ui/badge";
import { Button } from "@/app/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/app/components/ui/dialog";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/app/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/components/ui/select";
import { Textarea } from "@/app/components/ui/textarea";
import { useReadingTopicOptions } from "@/app/features/reading/hooks/use-reading-passages";
import {
  useConvertReadingSourceCandidate,
  useReadingSourceCandidate,
  useRejectReadingSourceCandidate,
} from "@/app/features/reading-source-candidates/hooks/use-reading-source-candidates";

const slugify = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/gu, "-")
    .replace(/^-|-$/gu, "");

function initialForm(
  candidate: AdminReadingSourceCandidateDetail,
): ConvertReadingSourceCandidatePayload {
  return {
    body: candidate.plainTextDraft,
    cefrLevel: "A1",
    estimatedMinutes: Math.max(
      1,
      Math.ceil(candidate.plainTextDraft.split(/\s+/u).length / 180),
    ),
    questions: candidate.questions.map((question, index) => ({
      options: question.choices.map((choice, optionIndex) => ({
        correct: choice.label === question.correct,
        order: optionIndex + 1,
        text: choice.text,
      })),
      order: index + 1,
      prompt: question.question,
    })),
    slug: slugify(candidate.sourceTitle),
    title: candidate.sourceTitle,
    topicId: null,
  };
}

type CandidateReviewContentProps = {
  candidate: AdminReadingSourceCandidateDetail;
  converting: boolean;
  onClose(): void;
  onConvert(payload: ConvertReadingSourceCandidatePayload): Promise<unknown>;
  onReject(reason: string): Promise<unknown>;
  rejecting: boolean;
  topics: ReadingTopicOption[];
};

function CandidateReviewContent({
  candidate,
  converting,
  onClose,
  onConvert,
  onReject,
  rejecting,
  topics,
}: CandidateReviewContentProps) {
  const [form, setForm] = useState(() => initialForm(candidate));
  const [reason, setReason] = useState("");
  const [confirmConvert, setConfirmConvert] = useState(false);
  const pending = candidate.status === "PENDING";

  const convertDraft = async () => {
    if (form.topicId === null) {
      setConfirmConvert(false);
      toast.error("Vui lòng gán topic trước khi chuyển đổi.");
      return;
    }
    try {
      await onConvert(form);
      toast.success("Đã tạo Reading draft.");
      onClose();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Không thể chuyển đổi candidate.",
      );
    }
  };

  const rejectCandidate = async () => {
    if (!reason.trim()) {
      toast.error("Vui lòng nhập lý do từ chối.");
      return;
    }
    try {
      await onReject(reason.trim());
      toast.success("Đã từ chối candidate.");
      onClose();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Không thể từ chối candidate.",
      );
    }
  };

  return (
    <div className="space-y-6">
      <dl className="grid gap-4 border-y py-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
        {[
          ["Nguồn", candidate.source],
          ["Level", candidate.sourceLevel],
          ["Câu hỏi", candidate.questionCount],
          ["Trạng thái", candidate.status],
        ].map(([label, value]) => (
          <div key={String(label)}>
            <dt className="text-xs text-muted-foreground">{label}</dt>
            <dd className="mt-1 font-medium">{value}</dd>
          </div>
        ))}
        <div className="sm:col-span-2">
          <dt className="text-xs text-muted-foreground">Source ID</dt>
          <dd className="mt-1 break-all font-mono text-xs">{candidate.sourceId}</dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="text-xs text-muted-foreground">Checksum</dt>
          <dd className="mt-1 break-all font-mono text-xs">{candidate.contentSha256}</dd>
        </div>
      </dl>

      <div className="grid gap-4 lg:grid-cols-2">
        <div>
          <Label>HTML nguồn đã escape</Label>
          <pre className="mt-2 max-h-72 overflow-auto whitespace-pre-wrap rounded-lg border bg-muted/40 p-4 text-xs leading-5">
            {candidate.sourceHtml}
          </pre>
        </div>
        <div>
          <Label htmlFor="candidate-body">Bản nháp</Label>
          <Textarea
            className="mt-2 min-h-72 leading-6"
            disabled={!pending}
            id="candidate-body"
            onChange={(event) => setForm({ ...form, body: event.target.value })}
            value={form.body}
          />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div>
          <Label htmlFor="candidate-slug">Slug</Label>
          <Input disabled={!pending} id="candidate-slug" onChange={(event) => setForm({ ...form, slug: event.target.value })} value={form.slug} />
        </div>
        <div>
          <Label htmlFor="candidate-title">Tiêu đề</Label>
          <Input disabled={!pending} id="candidate-title" onChange={(event) => setForm({ ...form, title: event.target.value })} value={form.title} />
        </div>
        <div>
          <Label htmlFor="candidate-minutes">Phút đọc</Label>
          <Input disabled={!pending} id="candidate-minutes" min={1} onChange={(event) => setForm({ ...form, estimatedMinutes: Number(event.target.value) })} type="number" value={form.estimatedMinutes} />
        </div>
        <div>
          <Label htmlFor="candidate-cefr">CEFR</Label>
          <Select disabled={!pending} onValueChange={(cefrLevel) => setForm({ ...form, cefrLevel: cefrLevel as typeof form.cefrLevel })} value={form.cefrLevel}>
            <SelectTrigger className="mt-2 w-full" id="candidate-cefr"><SelectValue /></SelectTrigger>
            <SelectContent>{READING_CEFR_LEVELS.map((level) => <SelectItem key={level} value={level}>{level}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="md:col-span-2">
          <Label htmlFor="candidate-topic">Topic</Label>
          <Select disabled={!pending} onValueChange={(topicId) => setForm({ ...form, topicId: topicId === "none" ? null : Number(topicId) })} value={form.topicId === null ? "none" : String(form.topicId)}>
            <SelectTrigger className="mt-2 w-full" id="candidate-topic"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="none">Không gán topic</SelectItem>{topics.map((topic) => <SelectItem key={topic.id} value={String(topic.id)}>{topic.title}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>

      <section className="space-y-3">
        <h3 className="font-semibold">Câu hỏi và đáp án</h3>
        {form.questions.map((question, questionIndex) => (
          <div className="rounded-lg border p-4" key={questionIndex}>
            <Input
              aria-label={`Câu hỏi ${questionIndex + 1}`}
              disabled={!pending}
              onChange={(event) => setForm({ ...form, questions: form.questions.map((item, index) => index === questionIndex ? { ...item, prompt: event.target.value } : item) })}
              value={question.prompt}
            />
            <RadioGroup
              className="mt-3 grid gap-2 sm:grid-cols-2"
              disabled={!pending}
              onValueChange={(selected) => setForm({ ...form, questions: form.questions.map((item, index) => index === questionIndex ? { ...item, options: item.options.map((choice, choiceIndex) => ({ ...choice, correct: choiceIndex === Number(selected) })) } : item) })}
              value={String(Math.max(0, question.options.findIndex((option) => option.correct)))}
            >
              {question.options.map((option, optionIndex) => (
                <div className="flex items-center gap-2 rounded-lg border p-2" key={optionIndex}>
                  <RadioGroupItem aria-label={`Đáp án ${optionIndex + 1} đúng`} value={String(optionIndex)} />
                  {option.correct ? <Check aria-label="Đúng" className="size-4" /> : <X aria-label="Nhiễu" className="size-4 text-muted-foreground" />}
                  <Input
                    aria-label={`Đáp án ${optionIndex + 1}`}
                    disabled={!pending}
                    onChange={(event) => setForm({ ...form, questions: form.questions.map((item, index) => index === questionIndex ? { ...item, options: item.options.map((choice, choiceIndex) => choiceIndex === optionIndex ? { ...choice, text: event.target.value } : choice) } : item) })}
                    value={option.text}
                  />
                </div>
              ))}
            </RadioGroup>
            <p className="mt-2 text-xs text-muted-foreground">{candidate.questions[questionIndex]?.translation}</p>
            <p className="mt-1 text-xs text-muted-foreground">{candidate.questions[questionIndex]?.explanation}</p>
          </div>
        ))}
      </section>

      {candidate.convertedPassageId !== null ? (
        <Button asChild variant="link"><Link href={`/reading-passages?edit=${candidate.convertedPassageId}`}>Mở Reading passage đã chuyển đổi <ExternalLink aria-hidden="true" /></Link></Button>
      ) : null}

      {pending ? (
        <div className="flex flex-col gap-3 border-t pt-5 sm:flex-row sm:items-end">
          <div className="flex-1">
            <Label htmlFor="reject-reason">Lý do từ chối</Label>
            <Input id="reject-reason" onChange={(event) => setReason(event.target.value)} value={reason} />
          </div>
          <Button disabled={rejecting} onClick={() => void rejectCandidate()} variant="outline">Từ chối</Button>
          <Button disabled={converting} onClick={() => setConfirmConvert(true)}>Chuyển thành draft</Button>
        </div>
      ) : (
        <Badge variant="outline">Candidate không còn ở trạng thái chờ duyệt</Badge>
      )}

      <AlertDialog onOpenChange={setConfirmConvert} open={confirmConvert}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Tạo Reading draft?</AlertDialogTitle><AlertDialogDescription>Candidate sẽ được chuyển thành một passage bản nháp với nội dung đang hiển thị.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Hủy</AlertDialogCancel><AlertDialogAction onClick={(event) => { event.preventDefault(); void convertDraft(); }}>Xác nhận chuyển đổi</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

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
        <DialogHeader><DialogTitle>Kiểm duyệt Reading candidate</DialogTitle><DialogDescription>HTML nguồn chỉ hiển thị dạng text; chỉnh bản nháp trước khi chuyển đổi.</DialogDescription></DialogHeader>
        {query.isError ? (
          <ErrorState description="Không thể tải candidate." onRetry={() => void query.refetch()} />
        ) : query.isLoading || !query.data ? (
          <LoadingState label="Đang tải candidate" rows={2} />
        ) : (
          <CandidateReviewContent
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
