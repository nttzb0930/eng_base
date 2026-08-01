"use client";

import { ArrowLeft, ArrowRight, CheckCircle2, Headphones, RotateCcw, Volume2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";

import { FeedWrapper } from "@/app/components/layout/FeedWrapper";
import { LocalizedLink as Link } from "@/app/components/navigation/LocalizedLink";
import { Button } from "@/app/components/ui/button";
import { ToeicDictationSessionSkeleton } from "@/app/features/toeic-dictation/components/ToeicDictationSessionSkeleton";
import { useSubmitToeicDictation, useToeicDictationMedia, useToeicDictationProgress, useToeicDictationSet } from "@/app/features/toeic-dictation/hooks/use-toeic-dictation";
import type { ToeicDictationSubmitResult } from "@repo/shared";

type Props = { setId: number };

export function ToeicDictationSessionView({ setId }: Props) {
  const t = useTranslations("toeicDictation.session");
  const setQuery = useToeicDictationSet(setId);
  const progressQuery = useToeicDictationProgress(setId);
  const [index, setIndex] = useState(0);
  const [typedText, setTypedText] = useState("");
  const [result, setResult] = useState<ToeicDictationSubmitResult | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const submit = useSubmitToeicDictation();
  const item = setQuery.data?.items[index];
  const mediaQuery = useToeicDictationMedia(item?.mediaId ?? 0);
  const progressByItem = useMemo(() => new Map((progressQuery.data?.items ?? []).map((entry) => [entry.itemId, entry])), [progressQuery.data]);

  useEffect(() => {
    if (!setQuery.data || !progressQuery.data) return;
    const firstUnanswered = setQuery.data.items.findIndex((entry) => !progressByItem.get(entry.id)?.lastAttemptedAt);
    // The initial unanswered item is derived from data loaded asynchronously.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIndex(firstUnanswered >= 0 ? firstUnanswered : 0);
  }, [setQuery.data, progressQuery.data, progressByItem]);

  useEffect(() => {
    // Reset the editor whenever navigation changes the active item.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTypedText("");
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setResult(null);
  }, [item?.id]);

  useEffect(() => {
    if (!mediaQuery.data) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setAudioUrl(null);
      return;
    }
    const url = URL.createObjectURL(mediaQuery.data);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setAudioUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [mediaQuery.data]);

  if (setQuery.isLoading || progressQuery.isLoading) return <ToeicDictationSessionSkeleton />;
  if (setQuery.isError || progressQuery.isError || !setQuery.data || !progressQuery.data) return <FeedWrapper><section className="mx-auto mt-16 max-w-lg rounded-2xl border border-rose-200 p-7 text-center"><h1 className="text-lg font-semibold">{t("error")}</h1><Button type="button" onClick={() => { void setQuery.refetch(); void progressQuery.refetch(); }} className="mt-5 gap-2"><RotateCcw className="h-4 w-4" aria-hidden="true" />{t("saved")}</Button></section></FeedWrapper>;
  if (!item) return <FeedWrapper><section className="mx-auto mt-16 max-w-lg rounded-2xl border border-dashed p-10 text-center"><Headphones className="text-muted-foreground mx-auto h-8 w-8" /><p className="mt-4 text-sm">{t("empty")}</p></section></FeedWrapper>;

  const saved = progressByItem.get(item.id);
  const onSubmit = () => {
    if (!typedText.trim() || submit.isPending) return;
    submit.mutate({ itemId: item.id, payload: { itemId: item.id, sourceVersion: setQuery.data.sourceVersion, typedText, submissionKey: crypto.randomUUID() } }, { onSuccess: setResult });
  };
  const goTo = (next: number) => { setIndex(Math.max(0, Math.min(setQuery.data.items.length - 1, next))); };

  return <FeedWrapper><div className="min-h-dvh bg-background"><header className="border-b"><div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-5 sm:px-6"><Link href="/learn/cert/toeic/listening?mode=dictation" className="text-muted-foreground inline-flex items-center gap-2 text-sm font-semibold hover:text-emerald-600"><ArrowLeft className="h-4 w-4" aria-hidden="true" />{t("back")}</Link><span className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">{t("question", { current: index + 1, total: setQuery.data.items.length })}</span></div></header><main className="mx-auto max-w-3xl px-4 py-8 sm:px-6"><div className="flex items-center justify-between text-sm"><span className="font-semibold">{setQuery.data.displayName}</span><span className="text-muted-foreground">{saved?.mastered ? t("mastered") : saved ? t("accuracy", { accuracy: saved.latestAccuracy }) : t("saved")}</span></div><div className="bg-muted mt-3 h-2 overflow-hidden rounded-full"><div className="h-full rounded-full bg-emerald-600 transition-[width]" style={{ width: `${((index + 1) / setQuery.data.items.length) * 100}%` }} /></div><section className="bg-card mt-8 rounded-2xl border p-6 shadow-sm sm:p-8"><div className="flex items-center justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700 dark:text-emerald-300">{t("question", { current: index + 1, total: setQuery.data.items.length })}</p><h1 className="mt-3 text-2xl font-semibold">{t("play")}</h1></div><Volume2 className="h-7 w-7 text-emerald-600" aria-hidden="true" /></div>{audioUrl ? <audio className="mt-6 w-full" controls preload="metadata" src={audioUrl} aria-label={t("play")} /> : <p className="text-muted-foreground mt-6 rounded-xl border border-dashed p-4 text-sm">{mediaQuery.isLoading ? t("checking") : t("audioUnavailable")}</p>}<label className="mt-7 block text-sm font-semibold" htmlFor="dictation-answer">{t("placeholder")}</label><textarea id="dictation-answer" value={typedText} onChange={(event) => setTypedText(event.target.value)} rows={5} maxLength={5000} className="border-input bg-background mt-2 w-full resize-y rounded-xl border p-4 text-base outline-none focus-visible:ring-2 focus-visible:ring-emerald-500" placeholder={t("placeholder")} /><Button type="button" disabled={!typedText.trim() || submit.isPending} onClick={onSubmit} className="mt-4 min-h-11 w-full gap-2">{submit.isPending ? t("checking") : t("submit")}<CheckCircle2 className="h-4 w-4" aria-hidden="true" /></Button>{submit.isError && <p className="mt-3 text-sm text-rose-600">{t("submitError")}</p>}{result && <div className={`mt-6 rounded-xl border p-5 ${result.mastered ? "border-emerald-200 bg-emerald-50/60" : "border-amber-200 bg-amber-50/60"}`}><p className="font-semibold">{result.mastered ? t("mastered") : t("accuracy", { accuracy: result.accuracy })}</p><p className="mt-1 text-sm">{t("correctWords", { correct: result.wordsCorrect, total: result.totalWords })}</p><p className="mt-4 text-sm font-semibold">{t("transcript")}</p><p className="mt-1 text-sm">{result.transcript}</p>{result.translationVi && <><p className="mt-4 text-sm font-semibold">{t("translation")}</p><p className="mt-1 text-sm">{result.translationVi}</p></>}</div>}</section><div className="mt-6 flex items-center justify-between gap-3"><Button type="button" variant="outline" disabled={index === 0} onClick={() => goTo(index - 1)} className="gap-2"><ArrowLeft className="h-4 w-4" aria-hidden="true" />{t("previous")}</Button><Button type="button" disabled={index === setQuery.data.items.length - 1} onClick={() => goTo(index + 1)} className="gap-2">{t("next")}<ArrowRight className="h-4 w-4" aria-hidden="true" /></Button></div></main></div></FeedWrapper>;
}
