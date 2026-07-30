"use client";

import { useState } from "react";
import { Check, Loader2, X } from "lucide-react";
import type { ConvertReadingSourceCandidatePayload } from "@repo/shared";
import { READING_CEFR_LEVELS } from "@repo/shared";
import { toast } from "sonner";

import { Button } from "@/app/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/app/components/ui/dialog";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { useReadingTopicOptions } from "@/app/features/reading/hooks/use-reading-passages";
import { useConvertReadingSourceCandidate, useReadingSourceCandidate, useRejectReadingSourceCandidate } from "../hooks/use-reading-source-candidates";

const slugify = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/gu, "-").replace(/^-|-$/gu, "");

function initialForm(candidate: NonNullable<ReturnType<typeof useReadingSourceCandidate>["data"]>): ConvertReadingSourceCandidatePayload {
  return {
    slug: slugify(candidate.sourceTitle), title: candidate.sourceTitle,
    body: candidate.plainTextDraft, cefrLevel: "A1", topicId: null,
    estimatedMinutes: Math.max(1, Math.ceil(candidate.plainTextDraft.split(/\s+/u).length / 180)),
    questions: candidate.questions.map((question, index) => ({
      prompt: question.question, order: index + 1,
      options: question.choices.map((choice, optionIndex) => ({
        text: choice.text, order: optionIndex + 1, correct: choice.label === question.correct,
      })),
    })),
  };
}

export function ReadingSourceCandidateReviewDialog({ candidateId, onClose }: { candidateId: number | null; onClose: () => void }) {
  const query = useReadingSourceCandidate(candidateId);
  const topics = useReadingTopicOptions();
  const convert = useConvertReadingSourceCandidate(candidateId);
  const reject = useRejectReadingSourceCandidate(candidateId);
  const [formState, setFormState] = useState<{ id: number; value: ConvertReadingSourceCandidatePayload } | null>(null);
  const [reason, setReason] = useState("");

  if (query.data && formState?.id !== query.data.id) {
    setFormState({ id: query.data.id, value: initialForm(query.data) });
  }
  const form = query.data && formState?.id === query.data.id ? formState.value : null;
  const setForm = (value: ConvertReadingSourceCandidatePayload) => {
    if (query.data) setFormState({ id: query.data.id, value });
  };

  async function convertDraft() {
    if (!form) return;
    if (form.topicId === null) return toast.error("Vui lòng gán topic trước khi convert.");
    if (!window.confirm("Tạo Reading draft từ candidate này?")) return;
    try { await convert.mutateAsync(form); toast.success("Đã tạo Reading draft."); onClose(); }
    catch (error) { toast.error(error instanceof Error ? error.message : "Không thể convert candidate."); }
  }
  async function rejectCandidate() {
    if (!reason.trim()) return toast.error("Vui lòng nhập lý do từ chối.");
    try { await reject.mutateAsync({ reason: reason.trim() }); toast.success("Đã từ chối candidate."); onClose(); }
    catch (error) { toast.error(error instanceof Error ? error.message : "Không thể từ chối candidate."); }
  }
  const pending = query.data?.status === "PENDING";

  return (
    <Dialog open={candidateId !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[92dvh] max-w-6xl overflow-y-auto">
        <DialogHeader><DialogTitle>Kiểm duyệt Reading candidate</DialogTitle><DialogDescription>HTML nguồn chỉ hiển thị dạng text; chỉnh bản nháp trước khi convert.</DialogDescription></DialogHeader>
        {query.isError ? (
          <div className="flex min-h-48 items-center justify-center text-red-600">Không thể tải candidate.</div>
        ) : query.isLoading || !query.data || !form ? (
          <div className="flex min-h-48 items-center justify-center text-zinc-500"><Loader2 className="mr-2 size-4 animate-spin" />Đang tải</div>
        ) : <div className="space-y-6">
          <div className="grid gap-3 border-y py-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
            <div><span className="text-zinc-500">Nguồn</span><p>{query.data.source}</p></div><div><span className="text-zinc-500">Level</span><p>{query.data.sourceLevel}</p></div><div><span className="text-zinc-500">Câu hỏi</span><p>{query.data.questionCount}</p></div><div><span className="text-zinc-500">Trạng thái</span><p>{query.data.status}</p></div>
            <div className="sm:col-span-2"><span className="text-zinc-500">Source ID</span><p className="break-all font-mono text-xs">{query.data.sourceId}</p></div><div className="sm:col-span-2"><span className="text-zinc-500">Checksum</span><p className="break-all font-mono text-xs">{query.data.contentSha256}</p></div>
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <div><Label>HTML nguồn đã escape</Label><pre className="mt-2 max-h-72 overflow-auto whitespace-pre-wrap rounded-lg border bg-zinc-50 p-4 text-xs leading-5">{query.data.sourceHtml}</pre></div>
            <div><Label htmlFor="candidate-body">Bản nháp</Label><textarea id="candidate-body" className="mt-2 min-h-72 w-full rounded-lg border p-4 text-sm leading-6 focus-visible:ring-2" value={form.body} disabled={!pending} onChange={(event) => setForm({ ...form, body: event.target.value })} /></div>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <div><Label htmlFor="candidate-slug">Slug</Label><Input id="candidate-slug" value={form.slug} disabled={!pending} onChange={(e) => setForm({ ...form, slug: e.target.value })} /></div>
            <div><Label htmlFor="candidate-title">Tiêu đề</Label><Input id="candidate-title" value={form.title} disabled={!pending} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
            <div><Label htmlFor="candidate-minutes">Phút đọc</Label><Input id="candidate-minutes" type="number" min={1} value={form.estimatedMinutes} disabled={!pending} onChange={(e) => setForm({ ...form, estimatedMinutes: Number(e.target.value) })} /></div>
            <div><Label htmlFor="candidate-cefr">CEFR</Label><select id="candidate-cefr" className="h-10 w-full rounded-md border bg-white px-3" value={form.cefrLevel} disabled={!pending} onChange={(e) => setForm({ ...form, cefrLevel: e.target.value as typeof form.cefrLevel })}>{READING_CEFR_LEVELS.map((level) => <option key={level}>{level}</option>)}</select></div>
            <div className="md:col-span-2"><Label htmlFor="candidate-topic">Topic</Label><select id="candidate-topic" className="h-10 w-full rounded-md border bg-white px-3" value={form.topicId ?? ""} disabled={!pending} onChange={(e) => setForm({ ...form, topicId: e.target.value ? Number(e.target.value) : null })}><option value="">Không gán topic</option>{(topics.data ?? []).map((topic) => <option key={topic.id} value={topic.id}>{topic.title}</option>)}</select></div>
          </div>
          <div className="space-y-3"><h3 className="font-semibold">Câu hỏi và đáp án</h3>{form.questions.map((question, questionIndex) => <div key={questionIndex} className="rounded-xl border p-4"><Input aria-label={`Câu hỏi ${questionIndex + 1}`} value={question.prompt} disabled={!pending} onChange={(event) => setForm({ ...form, questions: form.questions.map((item, index) => index === questionIndex ? { ...item, prompt: event.target.value } : item) })} /><div className="mt-3 grid gap-2 sm:grid-cols-2">{question.options.map((option, optionIndex) => <label key={optionIndex} className="flex items-center gap-2 rounded-lg border p-2"><input type="radio" name={`correct-${questionIndex}`} checked={option.correct} disabled={!pending} onChange={() => setForm({ ...form, questions: form.questions.map((item, index) => index === questionIndex ? { ...item, options: item.options.map((choice, choiceIndex) => ({ ...choice, correct: choiceIndex === optionIndex })) } : item) })} />{option.correct ? <Check className="size-4 text-emerald-600" aria-label="Đúng" /> : <X className="size-4 text-zinc-400" aria-label="Nhiễu" />}<Input value={option.text} disabled={!pending} aria-label={`Đáp án ${optionIndex + 1}`} onChange={(event) => setForm({ ...form, questions: form.questions.map((item, index) => index === questionIndex ? { ...item, options: item.options.map((choice, choiceIndex) => choiceIndex === optionIndex ? { ...choice, text: event.target.value } : choice) } : item) })} /></label>)}</div><p className="mt-2 text-xs text-zinc-500">{query.data.questions[questionIndex]?.translation}</p><p className="mt-1 text-xs text-zinc-500">{query.data.questions[questionIndex]?.explanation}</p></div>)}</div>
          {query.data.convertedPassageId !== null && <a className="inline-flex text-sm font-medium text-blue-600 underline-offset-4 hover:underline" href={`/reading-passages?edit=${query.data.convertedPassageId}`}>Mở Reading passage đã convert</a>}
          {pending && <div className="flex flex-col gap-3 border-t pt-5 sm:flex-row sm:items-end"><div className="flex-1"><Label htmlFor="reject-reason">Lý do từ chối</Label><Input id="reject-reason" value={reason} onChange={(e) => setReason(e.target.value)} /></div><Button variant="outline" onClick={rejectCandidate} disabled={reject.isPending}>Từ chối</Button><Button onClick={convertDraft} disabled={convert.isPending}>Convert thành draft</Button></div>}
        </div>}
      </DialogContent>
    </Dialog>
  );
}
