"use client";

import { useState } from "react";
import { Check, Edit2, Loader2, Plus, Send, X } from "lucide-react";
import type {
  AdminReadingPassage,
  CreateReadingPassagePayload,
  ReadingQuestionInput,
} from "@repo/shared";
import { READING_CEFR_LEVELS } from "@repo/shared";
import { toast } from "sonner";

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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/app/components/ui/table";
import {
  useCreateReadingPassage,
  useReadingPassages,
  useReadingTopicOptions,
  useSetReadingPublication,
  useUpdateReadingPassage,
} from "../hooks/use-reading-passages";

const emptyQuestion = (): ReadingQuestionInput => ({
  prompt: "",
  order: 1,
  options: [
    { text: "", order: 1, correct: true },
    { text: "", order: 2, correct: false },
  ],
});

const emptyForm = (): CreateReadingPassagePayload => ({
  slug: "",
  title: "",
  body: "",
  cefrLevel: READING_CEFR_LEVELS[0],
  topicId: null,
  estimatedMinutes: 3,
  questions: [emptyQuestion()],
});

function normalizeQuestions(
  questions: ReadingQuestionInput[]
): ReadingQuestionInput[] {
  return questions.map((question, questionIndex) => ({
    prompt: question.prompt.trim(),
    order: questionIndex + 1,
    options: question.options.map((option, optionIndex) => ({
      text: option.text.trim(),
      order: optionIndex + 1,
      correct: option.correct,
    })),
  }));
}

function toForm(passage: AdminReadingPassage): CreateReadingPassagePayload {
  return {
    slug: passage.slug,
    title: passage.title,
    body: passage.body,
    cefrLevel: passage.cefrLevel,
    topicId: passage.topicId,
    estimatedMinutes: passage.estimatedMinutes,
    questions: passage.questions.map((question) => ({
      prompt: question.prompt,
      order: question.order,
      options: question.options.map((option) => ({
        text: option.text,
        order: option.order,
        correct: option.correct,
      })),
    })),
  };
}

export function ReadingPassagesScreen() {
  const passagesQuery = useReadingPassages();
  const topicsQuery = useReadingTopicOptions();
  const createMutation = useCreateReadingPassage();
  const [editingId, setEditingId] = useState<number | null>(null);
  const updateMutation = useUpdateReadingPassage(editingId);
  const publishMutation = useSetReadingPublication("publish");
  const unpublishMutation = useSetReadingPublication("unpublish");
  const [isOpen, setIsOpen] = useState(false);
  const [form, setForm] = useState<CreateReadingPassagePayload>(emptyForm);

  const isEditing = editingId !== null;
  const isSaving = createMutation.isPending || updateMutation.isPending;

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm());
    setIsOpen(true);
  }

  function openEdit(passage: AdminReadingPassage) {
    setEditingId(passage.id);
    setForm(toForm(passage));
    setIsOpen(true);
  }

  function updateQuestion(
    questionIndex: number,
    next: Partial<ReadingQuestionInput>
  ) {
    setForm((current) => ({
      ...current,
      questions: current.questions.map((question, index) =>
        index === questionIndex ? { ...question, ...next } : question
      ),
    }));
  }

  function addOption(questionIndex: number) {
    const question = form.questions[questionIndex];
    updateQuestion(questionIndex, {
      options: [
        ...question.options,
        {
          text: "",
          order: question.options.length + 1,
          correct: false,
        },
      ],
    });
  }

  function removeOption(questionIndex: number, optionIndex: number) {
    const question = form.questions[questionIndex];
    if (question.options.length <= 2) {
      toast.error("Mỗi câu hỏi cần ít nhất hai đáp án.");
      return;
    }
    const options = question.options.filter(
      (_, index) => index !== optionIndex
    );
    if (!options.some((option) => option.correct)) {
      options[0] = { ...options[0], correct: true };
    }
    updateQuestion(questionIndex, { options });
  }

  function setCorrectOption(questionIndex: number, optionIndex: number) {
    const question = form.questions[questionIndex];
    updateQuestion(questionIndex, {
      options: question.options.map((option, index) => ({
        ...option,
        correct: index === optionIndex,
      })),
    });
  }

  function removeQuestion(questionIndex: number) {
    if (form.questions.length === 1) {
      toast.error("Passage cần ít nhất một câu hỏi.");
      return;
    }
    setForm((current) => ({
      ...current,
      questions: current.questions.filter(
        (_, index) => index !== questionIndex
      ),
    }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const payload = {
      ...form,
      slug: form.slug.trim(),
      title: form.title.trim(),
      body: form.body.trim(),
      questions: normalizeQuestions(form.questions),
    };
    const invalidQuestion = payload.questions.some(
      (question) =>
        !question.prompt ||
        question.options.length < 2 ||
        question.options.some((option) => !option.text) ||
        question.options.filter((option) => option.correct).length !== 1
    );
    if (!payload.slug || !payload.title || !payload.body || invalidQuestion) {
      toast.error("Vui lòng hoàn thiện passage, câu hỏi và các đáp án.");
      return;
    }

    try {
      if (isEditing) {
        await updateMutation.mutateAsync({
          title: payload.title,
          body: payload.body,
          cefrLevel: payload.cefrLevel,
          topicId: payload.topicId,
          estimatedMinutes: payload.estimatedMinutes,
          questions: payload.questions,
        });
      } else {
        await createMutation.mutateAsync(payload);
      }
      toast.success(isEditing ? "Đã cập nhật passage." : "Đã tạo passage.");
      setIsOpen(false);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Không thể lưu passage."
      );
    }
  }

  async function togglePublication(passage: AdminReadingPassage) {
    try {
      if (passage.status === "PUBLISHED") {
        await unpublishMutation.mutateAsync(passage.id);
        toast.success("Đã gỡ xuất bản passage.");
      } else {
        await publishMutation.mutateAsync(passage.id);
        toast.success("Đã xuất bản passage.");
      }
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Không thể thay đổi trạng thái xuất bản."
      );
    }
  }

  const publicationPending =
    publishMutation.isPending || unpublishMutation.isPending;

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 p-4 md:p-6">
      <header className="flex flex-col gap-4 border-b border-zinc-200 pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-2xl">
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-blue-600">
            Reading · CEFR A1
          </p>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-950">
            Nội dung đọc hiểu
          </h1>
          <p className="mt-1.5 text-sm leading-6 text-zinc-500">
            Soạn passage, câu hỏi trắc nghiệm và kiểm soát nội dung hiển thị cho
            học viên.
          </p>
        </div>
        <Button
          onClick={openCreate}
          className="h-10 cursor-pointer gap-2 rounded-lg bg-zinc-900 px-4 text-white hover:bg-zinc-800"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          Tạo passage
        </Button>
      </header>

      <section className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
        <Table>
          <TableHeader className="bg-zinc-50">
            <TableRow>
              <TableHead>Passage</TableHead>
              <TableHead>Level</TableHead>
              <TableHead>Topic</TableHead>
              <TableHead>Câu hỏi</TableHead>
              <TableHead>Trạng thái</TableHead>
              <TableHead className="text-right">Hành động</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {passagesQuery.isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="h-32 text-center">
                  <Loader2 className="mx-auto h-5 w-5 animate-spin text-zinc-400" />
                  <span className="sr-only">Đang tải passages</span>
                </TableCell>
              </TableRow>
            ) : passagesQuery.isError ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="h-32 text-center text-sm text-red-600"
                >
                  Không thể tải danh sách. Vui lòng thử lại.
                </TableCell>
              </TableRow>
            ) : passagesQuery.data?.length ? (
              passagesQuery.data.map((passage) => (
                <TableRow key={passage.id}>
                  <TableCell>
                    <p className="font-semibold text-zinc-900">
                      {passage.title}
                    </p>
                    <p className="mt-0.5 font-mono text-xs text-zinc-400">
                      {passage.slug}
                    </p>
                  </TableCell>
                  <TableCell className="font-semibold">
                    {passage.cefrLevel}
                  </TableCell>
                  <TableCell>{passage.topicTitle ?? "Không có"}</TableCell>
                  <TableCell>{passage.questions.length}</TableCell>
                  <TableCell>
                    <span
                      className={
                        passage.status === "PUBLISHED"
                          ? "inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700"
                          : "inline-flex items-center gap-1 rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-semibold text-zinc-600"
                      }
                    >
                      {passage.status === "PUBLISHED" ? (
                        <Check className="h-3 w-3" aria-hidden="true" />
                      ) : null}
                      {passage.status === "PUBLISHED"
                        ? "Đã xuất bản"
                        : "Bản nháp"}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => openEdit(passage)}
                        className="cursor-pointer gap-1.5"
                        aria-label={`Sửa ${passage.title}`}
                      >
                        <Edit2 className="h-3.5 w-3.5" aria-hidden="true" />
                        Sửa
                      </Button>
                      <Button
                        type="button"
                        variant={
                          passage.status === "PUBLISHED" ? "outline" : "default"
                        }
                        size="sm"
                        disabled={publicationPending}
                        onClick={() => togglePublication(passage)}
                        className="cursor-pointer gap-1.5"
                      >
                        {passage.status === "PUBLISHED" ? (
                          <X className="h-3.5 w-3.5" aria-hidden="true" />
                        ) : (
                          <Send className="h-3.5 w-3.5" aria-hidden="true" />
                        )}
                        {passage.status === "PUBLISHED"
                          ? "Gỡ xuất bản"
                          : "Xuất bản"}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="h-40 text-center text-sm text-zinc-500"
                >
                  Chưa có passage A1. Hãy tạo nội dung đầu tiên.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </section>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto border-zinc-200 bg-white p-0 text-zinc-950">
          <DialogHeader className="border-b border-zinc-200 px-6 py-5 text-left">
            <DialogTitle className="text-xl font-bold">
              {isEditing ? "Chỉnh sửa passage" : "Tạo passage A1"}
            </DialogTitle>
            <DialogDescription>
              Mỗi câu hỏi cần ít nhất hai đáp án và đúng một đáp án chính xác.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-7 px-6 pb-6">
            <div className="grid gap-5 pt-5 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="reading-slug">Slug</Label>
                <Input
                  id="reading-slug"
                  required
                  disabled={isEditing}
                  pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
                  value={form.slug}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      slug: event.target.value,
                    }))
                  }
                  placeholder="a-day-in-hanoi"
                />
                {isEditing ? (
                  <p className="text-xs text-zinc-500">
                    Slug không thể thay đổi sau khi tạo.
                  </p>
                ) : null}
              </div>
              <div className="space-y-2">
                <Label htmlFor="reading-title">Tiêu đề</Label>
                <Input
                  id="reading-title"
                  required
                  value={form.title}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      title: event.target.value,
                    }))
                  }
                  placeholder="A Day in Hanoi"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="reading-level">CEFR level</Label>
                <select
                  id="reading-level"
                  value={form.cefrLevel}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      cefrLevel: event.target
                        .value as CreateReadingPassagePayload["cefrLevel"],
                    }))
                  }
                  className="flex h-10 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400"
                >
                  {READING_CEFR_LEVELS.map((level) => (
                    <option key={level} value={level}>
                      {level}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="reading-topic">Topic</Label>
                <select
                  id="reading-topic"
                  value={form.topicId ?? ""}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      topicId: event.target.value
                        ? Number(event.target.value)
                        : null,
                    }))
                  }
                  className="flex h-10 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400"
                >
                  <option value="">Không có topic</option>
                  {topicsQuery.data?.map((topic) => (
                    <option key={topic.id} value={topic.id}>
                      {topic.title}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="reading-minutes">Thời gian đọc (phút)</Label>
                <Input
                  id="reading-minutes"
                  required
                  type="number"
                  min={1}
                  value={form.estimatedMinutes}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      estimatedMinutes: Number(event.target.value),
                    }))
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="reading-body">Nội dung passage</Label>
              <textarea
                id="reading-body"
                required
                rows={10}
                value={form.body}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    body: event.target.value,
                  }))
                }
                placeholder="Nhập nội dung đọc hiểu..."
                className="w-full resize-y rounded-md border border-zinc-200 bg-white px-3 py-3 text-sm leading-7 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400"
              />
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-bold text-zinc-900">Câu hỏi</h2>
                  <p className="text-xs text-zinc-500">
                    Thứ tự được lưu theo vị trí hiển thị.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setForm((current) => ({
                      ...current,
                      questions: [
                        ...current.questions,
                        {
                          ...emptyQuestion(),
                          order: current.questions.length + 1,
                        },
                      ],
                    }))
                  }
                  className="cursor-pointer gap-1.5"
                >
                  <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                  Thêm câu hỏi
                </Button>
              </div>

              {form.questions.map((question, questionIndex) => (
                <fieldset
                  key={questionIndex}
                  className="space-y-4 rounded-xl border border-zinc-200 bg-zinc-50/60 p-4"
                >
                  <legend className="px-1 text-sm font-bold text-zinc-700">
                    Câu {questionIndex + 1}
                  </legend>
                  <div className="flex gap-2">
                    <Input
                      required
                      value={question.prompt}
                      onChange={(event) =>
                        updateQuestion(questionIndex, {
                          prompt: event.target.value,
                        })
                      }
                      aria-label={`Nội dung câu hỏi ${questionIndex + 1}`}
                      placeholder="Nhập câu hỏi..."
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeQuestion(questionIndex)}
                      aria-label={`Xóa câu hỏi ${questionIndex + 1}`}
                      className="shrink-0 cursor-pointer text-zinc-400 hover:text-red-600"
                    >
                      <X className="h-4 w-4" aria-hidden="true" />
                    </Button>
                  </div>

                  <div className="space-y-2">
                    {question.options.map((option, optionIndex) => (
                      <div
                        key={optionIndex}
                        className="flex items-center gap-3"
                      >
                        <input
                          type="radio"
                          name={`correct-${questionIndex}`}
                          checked={option.correct}
                          onChange={() =>
                            setCorrectOption(questionIndex, optionIndex)
                          }
                          aria-label={`Đặt đáp án ${optionIndex + 1} là đúng`}
                          className="h-4 w-4 accent-zinc-900"
                        />
                        <Input
                          required
                          value={option.text}
                          onChange={(event) => {
                            const options = question.options.map(
                              (currentOption, index) =>
                                index === optionIndex
                                  ? {
                                      ...currentOption,
                                      text: event.target.value,
                                    }
                                  : currentOption
                            );
                            updateQuestion(questionIndex, { options });
                          }}
                          aria-label={`Đáp án ${optionIndex + 1} câu ${questionIndex + 1}`}
                          placeholder={`Đáp án ${optionIndex + 1}`}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() =>
                            removeOption(questionIndex, optionIndex)
                          }
                          aria-label={`Xóa đáp án ${optionIndex + 1}`}
                          className="shrink-0 cursor-pointer text-zinc-400 hover:text-red-600"
                        >
                          <X className="h-4 w-4" aria-hidden="true" />
                        </Button>
                      </div>
                    ))}
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => addOption(questionIndex)}
                    className="cursor-pointer gap-1.5 text-zinc-600"
                  >
                    <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                    Thêm đáp án
                  </Button>
                </fieldset>
              ))}
            </div>

            <div className="flex justify-end gap-3 border-t border-zinc-200 pt-5">
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
                disabled={isSaving}
                className="min-w-28 cursor-pointer bg-zinc-900 text-white hover:bg-zinc-800"
              >
                {isSaving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : isEditing ? (
                  "Lưu thay đổi"
                ) : (
                  "Tạo passage"
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
