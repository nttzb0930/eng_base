"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  AlertTriangle,
  BookOpen,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Filter,
  Grid,
  IdCard,
  Play,
  Plus,
  RotateCw,
  Search,
  Sparkles,
  Volume2,
  X,
} from "lucide-react";

import { TopicDetailPageSkeleton } from "@/app/components/feedback/RouteSkeletons";
import { FeedWrapper } from "@/app/components/layout/FeedWrapper";
import { LocalizedLink as Link } from "@/app/components/navigation/LocalizedLink";
import { Button } from "@/app/components/ui/button";
import { useUserProgress } from "@/app/features/progress/hooks/use-user-progress";
import { useTopic } from "@/app/features/topics/hooks/use-topics";
import { withLocale } from "@/app/i18n/paths";
import { useCurrentLocale } from "@/app/i18n/use-current-locale";
import { cn } from "@/app/utils/cn";

type TopicDetailViewProps = {
  slug: string;
  level?: string;
};

type FilterTab = "weak" | "all" | "learned" | "unlearned";

const PAGE_SIZE = 10;

export function TopicDetailView({ slug, level }: TopicDetailViewProps) {
  const t = useTranslations("topics");
  const nav = useTranslations("navigation");
  const router = useRouter();
  const locale = useCurrentLocale();

  const userProgressQuery = useUserProgress();
  const topicQuery = useTopic(slug, locale, level);

  const [activeFilter, setActiveFilter] = useState<FilterTab>("weak");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [showStudyModal, setShowStudyModal] = useState(false);
  const [playingAudio, setPlayingAudio] = useState<string | null>(null);

  const userProgress = userProgressQuery.data;
  const topic = topicQuery.data;
  const isLoading = userProgressQuery.isLoading || topicQuery.isLoading;

  useEffect(() => {
    if (!isLoading && !userProgress?.activeCourse) {
      router.replace(withLocale("/courses", locale));
    }
  }, [isLoading, locale, router, userProgress?.activeCourse]);

  // Filter & Pagination logic
  const topicItems = topic?.items;
  const filteredItems = useMemo(() => {
    if (!topicItems) return [];

    return topicItems.filter((item) => {
      // Search filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchesWord = item.word.toLowerCase().includes(query);
        const matchesMeaning = item.meaningVi.toLowerCase().includes(query);
        if (!matchesWord && !matchesMeaning) return false;
      }

      const state = item.learnerState;
      if (activeFilter === "weak") return state.weak;
      if (activeFilter === "learned") return state.learned;
      if (activeFilter === "unlearned") return state.unlearned;
      return true;
    });
  }, [topicItems, activeFilter, searchQuery]);

  const totalPages = Math.ceil(filteredItems.length / PAGE_SIZE) || 1;
  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredItems.slice(start, start + PAGE_SIZE);
  }, [filteredItems, currentPage]);

  const handlePlayAudio = (word: string) => {
    setPlayingAudio(word);
    const utterance = new SpeechSynthesisUtterance(word);
    utterance.lang = "en-US";
    utterance.onend = () => setPlayingAudio(null);
    speechSynthesis.speak(utterance);
  };

  if (isLoading || !userProgress?.activeCourse) {
    return <TopicDetailPageSkeleton />;
  }

  if (!topic) {
    return (
      <FeedWrapper>
        <div className="surface-panel border-dashed p-8 text-center">
          <p className="font-bold text-neutral-700">{t("emptyTitle")}</p>
          <Button asChild variant="secondary" className="mt-4">
            <Link href={withLocale("/topics")}>{t("back")}</Link>
          </Button>
        </div>
      </FeedWrapper>
    );
  }

  // Stats
  const totalWords = topic.filteredStats.total;
  const learnedWords = topic.filteredStats.learned;
  const learningWords = topic.filteredStats.learning;
  const unlearnedWords = topic.filteredStats.unlearned;
  const masteredWords = topic.filteredStats.mastered;
  const weakWordsCount = topic.filteredStats.weak;

  return (
    <>
      <FeedWrapper>
        <div className="pb-12">
          {/* Breadcrumb Navigation */}
          <div className="text-muted-foreground mb-6 flex items-center gap-2 text-sm">
            <Link
              href={withLocale("/learn")}
              className="transition-colors hover:text-emerald-600"
            >
              {nav("learn")}
            </Link>
            <ChevronRight className="text-border h-3.5 w-3.5" />
            <Link
              href={withLocale("/topics")}
              className="transition-colors hover:text-emerald-600"
            >
              {t("byTopic")}
            </Link>
            <ChevronRight className="text-border h-3.5 w-3.5" />
            <span className="text-foreground font-medium">{topic.title}</span>
          </div>

          {/* Topic Header Card V3 */}
          <div className="border-border bg-card shadow-xs mb-6 rounded-2xl border p-6">
            <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-center">
              {/* Left: Icon & Topic Meta */}
              <div className="flex items-start gap-4">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 text-3xl text-white shadow-lg shadow-blue-500/20 dark:shadow-none">
                  <IdCard className="h-8 w-8 stroke-[2]" />
                </div>

                <div>
                  <div className="mb-1 flex items-center gap-2">
                    <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:border-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400">
                      {t("eyebrow")}
                    </span>
                  </div>

                  <h1 className="text-foreground mb-1.5 text-2xl font-bold tracking-tight sm:text-3xl">
                    {topic.title}
                  </h1>

                  <p className="text-muted-foreground mb-4 max-w-2xl text-xs leading-relaxed sm:text-sm">
                    {topic.description ||
                      `${totalWords} từ vựng về ${topic.title.toLowerCase()} và cách sử dụng trong tiếng Anh.`}
                  </p>

                  {/* Stats Chips */}
                  <div className="flex flex-wrap gap-2.5">
                    <div className="bg-muted text-foreground flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-medium">
                      <BookOpen className="text-muted-foreground h-3.5 w-3.5" />
                      <span>
                        {totalWords} {t("words").toLowerCase()}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                      <span>
                        {masteredWords} {t("masteredStatus").toLowerCase()}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 dark:border-blue-800 dark:bg-blue-950/60 dark:text-blue-400">
                      <Clock className="h-3.5 w-3.5 text-blue-600" />
                      <span>
                        {learningWords} {t("learningStatus").toLowerCase()}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 rounded-xl border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700 dark:border-amber-800 dark:bg-amber-950/60 dark:text-amber-400">
                      <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
                      <span>
                        {weakWordsCount} {t("weakStatus").toLowerCase()}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right: Quick Action Buttons */}
              <div className="flex min-w-[240px] flex-col gap-2.5">
                {/* Primary CTA: Continue Progress for this Topic */}
                <Link
                  href={withLocale(
                    `/practice/topic/${encodeURIComponent(slug)}`
                  )}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-emerald-500/20 transition-all duration-200 hover:-translate-y-0.5 hover:bg-emerald-700 dark:shadow-none"
                >
                  <Play className="h-4 w-4 fill-white" />
                  {t("continueTopicBtn")}
                </Link>

                {/* Secondary CTAs */}
                <div className="grid grid-cols-2 gap-2">
                  <Link
                    href={withLocale(
                      `/practice/topic/${encodeURIComponent(slug)}?mode=new`
                    )}
                    className="shadow-xs flex items-center justify-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2.5 text-xs font-semibold text-white transition hover:bg-blue-700"
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    {t("newWordsBtn")}
                  </Link>

                  <Link
                    href={withLocale(
                      `/practice/topic/${encodeURIComponent(slug)}?mode=weak`
                    )}
                    className="shadow-xs flex items-center justify-center gap-1.5 rounded-lg bg-amber-600 px-3 py-2.5 text-xs font-semibold text-white transition hover:bg-amber-700"
                  >
                    <AlertTriangle className="h-3.5 w-3.5" />
                    {t("studyWeakBtn", { count: weakWordsCount })}
                  </Link>
                </div>
              </div>
            </div>
          </div>

          {/* Filter Tabs & Toolbar */}
          <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div className="bg-card border-border/80 shadow-xs flex items-center gap-1.5 overflow-x-auto rounded-xl border p-1">
              <button
                onClick={() => {
                  setActiveFilter("weak");
                  setCurrentPage(1);
                }}
                className={cn(
                  "flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3.5 py-1.5 text-xs font-bold transition-all",
                  activeFilter === "weak"
                    ? "border border-amber-200 bg-amber-100 text-amber-700 dark:border-amber-800 dark:bg-amber-950/80 dark:text-amber-400"
                    : "text-muted-foreground hover:bg-muted"
                )}
              >
                <AlertTriangle className="h-3.5 w-3.5" />
                {t("weakTab")} ({weakWordsCount})
              </button>

              <button
                onClick={() => {
                  setActiveFilter("all");
                  setCurrentPage(1);
                }}
                className={cn(
                  "flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all",
                  activeFilter === "all"
                    ? "border border-amber-200 bg-amber-100 font-bold text-amber-700 dark:border-amber-800 dark:bg-amber-950/80 dark:text-amber-400"
                    : "text-muted-foreground hover:bg-muted"
                )}
              >
                {t("all")} ({totalWords})
              </button>

              <button
                onClick={() => {
                  setActiveFilter("learned");
                  setCurrentPage(1);
                }}
                className={cn(
                  "flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all",
                  activeFilter === "learned"
                    ? "border border-emerald-200 bg-emerald-100 font-bold text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-400"
                    : "text-muted-foreground hover:bg-muted"
                )}
              >
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                {t("learnedLabel")} ({learnedWords})
              </button>

              <button
                onClick={() => {
                  setActiveFilter("unlearned");
                  setCurrentPage(1);
                }}
                className={cn(
                  "flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all",
                  activeFilter === "unlearned"
                    ? "border border-blue-200 bg-blue-100 font-bold text-blue-700 dark:border-blue-800 dark:bg-blue-950/80 dark:text-blue-400"
                    : "text-muted-foreground hover:bg-muted"
                )}
              >
                {t("unlearned")} ({unlearnedWords})
              </button>
            </div>

            {/* View Options & Search */}
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="text-muted-foreground pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  placeholder={t("searchPlaceholder")}
                  className="border-border bg-card text-foreground placeholder:text-muted-foreground w-full rounded-xl border py-1.5 pl-8 pr-3 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 sm:w-56"
                />
              </div>

              <button
                className="border-border/80 hover:bg-muted text-muted-foreground rounded-xl border p-2 transition-colors"
                title="Bộ lọc"
              >
                <Filter className="h-4 w-4" />
              </button>
              <button
                className="border-border/80 hover:bg-muted text-muted-foreground rounded-xl border p-2 transition-colors"
                title="Xem dạng lưới"
              >
                <Grid className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Words Table */}
          <div className="border-border/80 bg-card shadow-xs overflow-hidden rounded-2xl border">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-muted/40 border-border/60 text-muted-foreground border-b text-xs font-semibold uppercase tracking-wider">
                  <tr>
                    <th className="w-10 px-4 py-3 text-center">
                      <input
                        type="checkbox"
                        className="border-border rounded text-emerald-600 focus:ring-emerald-500"
                      />
                    </th>
                    <th className="px-4 py-3">{t("wordColumn")}</th>
                    <th className="w-36 px-4 py-3">{t("phoneticColumn")}</th>
                    <th className="px-4 py-3">{t("meaningColumn")}</th>
                    <th className="w-40 px-4 py-3">{t("statusColumn")}</th>
                    <th className="w-24 px-4 py-3 text-center">Thao tác</th>
                  </tr>
                </thead>

                <tbody className="divide-border/60 divide-y text-xs">
                  {paginatedItems.length === 0 ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="text-muted-foreground py-8 text-center font-medium"
                      >
                        {t("emptyTitle")}
                      </td>
                    </tr>
                  ) : (
                    paginatedItems.map((wordItem) => {
                      const state = wordItem.learnerState;

                      return (
                        <tr
                          key={wordItem.id}
                          className="hover:bg-muted/30 group transition-colors"
                        >
                          <td className="px-4 py-3.5 text-center">
                            <input
                              type="checkbox"
                              className="border-border rounded text-emerald-600 focus:ring-emerald-500"
                            />
                          </td>

                          <td className="px-4 py-3.5">
                            <div className="flex items-center gap-2">
                              <span className="text-foreground text-sm font-bold">
                                {wordItem.word}
                              </span>
                              <span className="text-muted-foreground text-[10px] font-medium">
                                {wordItem.pos ?? "noun"}
                              </span>
                            </div>
                          </td>

                          <td className="px-4 py-3.5">
                            <div className="flex items-center gap-2">
                              <span className="text-muted-foreground font-mono">
                                {wordItem.phonetic ?? "/ˈpɑː.spɔːt/"}
                              </span>
                              <button
                                onClick={() => handlePlayAudio(wordItem.word)}
                                className={cn(
                                  "rounded-full p-1 transition hover:bg-emerald-50 hover:text-emerald-600 dark:hover:bg-emerald-950/50",
                                  playingAudio === wordItem.word
                                    ? "animate-pulse text-emerald-600"
                                    : "text-muted-foreground"
                                )}
                                title="Phát âm"
                              >
                                <Volume2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </td>

                          <td className="text-foreground px-4 py-3.5 font-medium">
                            <p className="line-clamp-2">{wordItem.meaningVi}</p>
                          </td>

                          <td className="px-4 py-3.5">
                            {state.weak ? (
                              <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-[11px] font-semibold text-amber-700 dark:border-amber-800 dark:bg-amber-950/60 dark:text-amber-400">
                                <AlertTriangle className="h-3 w-3 text-amber-600" />{" "}
                                {t("weakStatus")}
                              </span>
                            ) : state.mastered ? (
                              <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400">
                                <CheckCircle2 className="h-3 w-3 text-emerald-600" />{" "}
                                {t("masteredStatus")}
                              </span>
                            ) : state.learning ? (
                              <span className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-2.5 py-0.5 text-[11px] font-semibold text-blue-700 dark:border-blue-800 dark:bg-blue-950/60 dark:text-blue-400">
                                <Clock className="h-3 w-3 text-blue-600" />{" "}
                                {t("learningStatus")}
                              </span>
                            ) : (
                              <span className="bg-muted text-muted-foreground border-border inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold">
                                {t("unlearned")}
                              </span>
                            )}
                          </td>

                          <td className="px-4 py-3.5 text-center">
                            <Link
                              href={withLocale("/flashcards")}
                              className="inline-flex items-center justify-center rounded-lg px-3 py-1 text-xs font-bold text-emerald-600 transition hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950/50"
                            >
                              {t("studyWordBtn")}
                            </Link>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            <div className="border-border/60 bg-muted/20 flex flex-col items-center justify-between gap-3 border-t px-4 py-3 text-xs sm:flex-row">
              <div className="text-muted-foreground font-medium">
                {t("showingRangeOfTotal", {
                  from: Math.min(
                    (currentPage - 1) * PAGE_SIZE + 1,
                    filteredItems.length
                  ),
                  to: Math.min(currentPage * PAGE_SIZE, filteredItems.length),
                  total: filteredItems.length,
                })}
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="border-border/80 text-foreground hover:bg-card rounded-lg border px-3 py-1.5 font-medium transition disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <ChevronLeft className="mr-1 inline h-3.5 w-3.5" />{" "}
                  {t("prev")}
                </button>

                {Array.from({ length: Math.min(5, totalPages) }).map(
                  (_, idx) => {
                    const pageNum = idx + 1;
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setCurrentPage(pageNum)}
                        className={cn(
                          "rounded-lg px-3 py-1.5 font-bold transition",
                          currentPage === pageNum
                            ? "shadow-xs bg-emerald-600 text-white"
                            : "border-border/80 text-foreground hover:bg-card border"
                        )}
                      >
                        {pageNum}
                      </button>
                    );
                  }
                )}

                {totalPages > 5 && (
                  <span className="text-muted-foreground px-1">...</span>
                )}

                <button
                  onClick={() =>
                    setCurrentPage((p) => Math.min(totalPages, p + 1))
                  }
                  disabled={currentPage === totalPages}
                  className="border-border/80 text-foreground hover:bg-card rounded-lg border px-3 py-1.5 font-medium transition disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {t("next")}{" "}
                  <ChevronRight className="ml-1 inline h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </FeedWrapper>

      {/* Phase 5: Mobile Floating Action Button (FAB) */}
      <button
        onClick={() => setShowStudyModal(true)}
        className="fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-600 text-2xl text-white shadow-lg transition-transform hover:scale-110 active:scale-95 lg:hidden"
        aria-label="Bắt đầu học"
      >
        <Plus className="h-7 w-7" />
      </button>

      {/* Phase 5: Mobile Bottom Sheet Study Menu Modal */}
      {showStudyModal && (
        <div className="backdrop-blur-xs animate-in fade-in fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 duration-200 sm:items-center">
          <div className="bg-card border-border animate-in slide-in-from-bottom w-full max-w-md rounded-2xl border p-6 shadow-2xl duration-300">
            <div className="mb-5 flex items-center justify-between">
              <h3 className="text-foreground text-base font-bold">
                {t("startStudyModalTitle")}
              </h3>
              <button
                onClick={() => setShowStudyModal(false)}
                className="hover:bg-muted text-muted-foreground rounded-full p-1.5 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-2.5">
              <Link
                href={withLocale("/flashcards")}
                onClick={() => setShowStudyModal(false)}
                className="flex w-full items-center gap-3.5 rounded-xl border border-amber-200 bg-amber-50 p-3.5 transition hover:bg-amber-100 dark:border-amber-800 dark:bg-amber-950/40"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500 text-white">
                  <AlertTriangle className="h-5 w-5" />
                </div>
                <div className="text-left">
                  <div className="text-sm font-bold text-amber-900 dark:text-amber-300">
                    {t("weakWordsOptionTitle")}
                  </div>
                  <div className="text-xs text-amber-700 dark:text-amber-400">
                    {t("weakWordsOptionSubtitle", { count: weakWordsCount })}
                  </div>
                </div>
              </Link>

              <Link
                href={withLocale("/flashcards")}
                onClick={() => setShowStudyModal(false)}
                className="flex w-full items-center gap-3.5 rounded-xl border border-blue-200 bg-blue-50 p-3.5 transition hover:bg-blue-100 dark:border-blue-800 dark:bg-blue-950/40"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-500 text-white">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div className="text-left">
                  <div className="text-sm font-bold text-blue-900 dark:text-blue-300">
                    {t("newWordsOptionTitle")}
                  </div>
                  <div className="text-xs text-blue-700 dark:text-blue-400">
                    {t("newWordsOptionSubtitle", { count: unlearnedWords })}
                  </div>
                </div>
              </Link>

              <Link
                href={withLocale("/flashcards")}
                onClick={() => setShowStudyModal(false)}
                className="flex w-full items-center gap-3.5 rounded-xl border border-indigo-200 bg-indigo-50 p-3.5 transition hover:bg-indigo-100 dark:border-indigo-800 dark:bg-indigo-950/40"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-500 text-white">
                  <RotateCw className="h-5 w-5" />
                </div>
                <div className="text-left">
                  <div className="text-sm font-bold text-indigo-900 dark:text-indigo-300">
                    {t("continueLearningOptionTitle")}
                  </div>
                  <div className="text-xs text-indigo-700 dark:text-indigo-400">
                    {t("continueLearningOptionSubtitle", {
                      count: learningWords,
                    })}
                  </div>
                </div>
              </Link>

              <Link
                href={withLocale("/flashcards")}
                onClick={() => setShowStudyModal(false)}
                className="flex w-full items-center gap-3.5 rounded-xl border border-emerald-200 bg-emerald-50 p-3.5 transition hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-950/40"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500 text-white">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
                <div className="text-left">
                  <div className="text-sm font-bold text-emerald-900 dark:text-emerald-300">
                    {t("reviewOptionTitle")}
                  </div>
                  <div className="text-xs text-emerald-700 dark:text-emerald-400">
                    {t("reviewOptionSubtitle", { count: learnedWords })}
                  </div>
                </div>
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
