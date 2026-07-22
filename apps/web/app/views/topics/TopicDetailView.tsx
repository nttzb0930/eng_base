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
  Lock,
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

    return topicItems.filter((item, index) => {
      // Search filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchesWord = item.word.toLowerCase().includes(query);
        const matchesMeaning = item.meaningVi.toLowerCase().includes(query);
        if (!matchesWord && !matchesMeaning) return false;
      }

      // Status tab filter
      const isWeak = index < 3;
      const isLearning = index === 3;
      const isMastered = index >= 4;
      const isUnlearned = index === 3; // mock split

      if (activeFilter === "weak") return isWeak;
      if (activeFilter === "learned") return isMastered;
      if (activeFilter === "unlearned") return isLearning || isUnlearned;
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
  const totalWords = topic.stats.total || topic.items.length;
  const learnedWords = topic.stats.learned;
  const learningWords = Math.max(0, totalWords - learnedWords - 8);
  const weakWordsCount = Math.min(8, topic.items.length);

  return (
    <>
      <FeedWrapper>
        <div className="pb-12">
        {/* Breadcrumb Navigation */}
            <div className="mb-6 flex items-center gap-2 text-sm text-muted-foreground">
              <Link href={withLocale("/learn")} className="hover:text-emerald-600 transition-colors">
                {nav("learn")}
              </Link>
              <ChevronRight className="h-3.5 w-3.5 text-border" />
              <Link href={withLocale("/topics")} className="hover:text-emerald-600 transition-colors">
                {t("byTopic")}
              </Link>
              <ChevronRight className="h-3.5 w-3.5 text-border" />
              <span className="font-medium text-foreground">{topic.title}</span>
            </div>

            {/* Topic Header Card V3 */}
            <div className="rounded-2xl border border-border bg-card p-6 shadow-xs mb-6">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                
                {/* Left: Icon & Topic Meta */}
                <div className="flex items-start gap-4">
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 text-white text-3xl shadow-lg shadow-blue-500/20 dark:shadow-none">
                    <IdCard className="h-8 w-8 stroke-[2]" />
                  </div>

                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-0.5 rounded-full uppercase tracking-wider border border-emerald-200 dark:border-emerald-800">
                        {t("eyebrow")}
                      </span>
                    </div>

                    <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground mb-1.5">
                      {topic.title}
                    </h1>

                    <p className="text-xs sm:text-sm text-muted-foreground mb-4 max-w-2xl leading-relaxed">
                      {topic.description || `${totalWords} từ vựng về ${topic.title.toLowerCase()} và cách sử dụng trong tiếng Anh.`}
                    </p>

                    {/* Stats Chips */}
                    <div className="flex flex-wrap gap-2.5">
                      <div className="flex items-center gap-1.5 px-3 py-1.5 bg-muted rounded-xl text-xs font-medium text-foreground">
                        <BookOpen className="h-3.5 w-3.5 text-muted-foreground" />
                        <span>{totalWords} {t("words").toLowerCase()}</span>
                      </div>

                      <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-950/60 rounded-xl text-xs font-semibold text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                        <span>{learnedWords} {t("masteredStatus").toLowerCase()}</span>
                      </div>

                      <div className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 dark:bg-blue-950/60 rounded-xl text-xs font-semibold text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
                        <Clock className="h-3.5 w-3.5 text-blue-600" />
                        <span>{learningWords} {t("learningStatus").toLowerCase()}</span>
                      </div>

                      <div className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 dark:bg-amber-950/60 rounded-xl text-xs font-semibold text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                        <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
                        <span>{weakWordsCount} {t("weakStatus").toLowerCase()}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right: Quick Action Buttons */}
                <div className="flex flex-col gap-2.5 min-w-[240px]">
                  {/* Primary CTA: Continue Progress for this Topic */}
                  <Link
                    href={withLocale(`/practice/topic/${encodeURIComponent(slug)}`)}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-5 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 dark:shadow-none transition-all duration-200 hover:-translate-y-0.5 text-sm"
                  >
                    <Play className="h-4 w-4 fill-white" />
                    {t("continueTopicBtn")}
                  </Link>

                  {/* Secondary CTAs */}
                  <div className="grid grid-cols-2 gap-2">
                    <Link
                      href={withLocale(`/practice/topic/${encodeURIComponent(slug)}?mode=new`)}
                      className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 px-3 rounded-lg flex items-center justify-center gap-1.5 text-xs shadow-xs transition"
                    >
                      <Sparkles className="h-3.5 w-3.5" />
                      {t("newWordsBtn")}
                    </Link>

                    <Link
                      href={withLocale(`/practice/topic/${encodeURIComponent(slug)}?mode=weak`)}
                      className="bg-amber-600 hover:bg-amber-700 text-white font-semibold py-2.5 px-3 rounded-lg flex items-center justify-center gap-1.5 text-xs shadow-xs transition"
                    >
                      <AlertTriangle className="h-3.5 w-3.5" />
                      {t("studyWeakBtn", { count: weakWordsCount })}
                    </Link>
                  </div>
                </div>

              </div>
            </div>

            {/* Cert Distribution Grid */}
            <div className="mb-7">
              <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">
                {t("certDistributionTitle")}
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* IELTS */}
                <div className="bg-card p-4 rounded-xl border border-border/80 shadow-xs hover:shadow-md transition-all cursor-pointer group">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-emerald-50 dark:bg-emerald-950/50 rounded-lg flex items-center justify-center text-emerald-600 dark:text-emerald-400 font-extrabold text-xs border border-emerald-200 dark:border-emerald-800">
                        IELTS
                      </div>
                      <div>
                        <div className="font-bold text-foreground text-sm">42 {t("words").toLowerCase()}</div>
                        <div className="text-xs text-muted-foreground">{t("learnedCount", { learned: 32, total: 42 })}</div>
                      </div>
                    </div>
                    
                    {/* SVG Circular Ring */}
                    <div className="w-12 h-12 relative">
                      <svg className="transform -rotate-90 w-12 h-12">
                        <circle cx="24" cy="24" r="20" stroke="currentColor" className="text-muted/60" strokeWidth="3.5" fill="none" />
                        <circle cx="24" cy="24" r="20" stroke="currentColor" className="text-emerald-500" strokeWidth="3.5" fill="none" strokeDasharray="125.6" strokeDashoffset="30" />
                      </svg>
                    </div>
                  </div>
                </div>

                {/* TOEIC */}
                <div className="bg-card p-4 rounded-xl border border-border/80 shadow-xs hover:shadow-md transition-all cursor-pointer group">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-50 dark:bg-blue-950/50 rounded-lg flex items-center justify-center text-blue-600 dark:text-blue-400 font-extrabold text-xs border border-blue-200 dark:border-blue-800">
                        TOEIC
                      </div>
                      <div>
                        <div className="font-bold text-foreground text-sm">28 {t("words").toLowerCase()}</div>
                        <div className="text-xs text-muted-foreground">{t("learnedCount", { learned: 18, total: 28 })}</div>
                      </div>
                    </div>
                    
                    {/* SVG Circular Ring */}
                    <div className="w-12 h-12 relative">
                      <svg className="transform -rotate-90 w-12 h-12">
                        <circle cx="24" cy="24" r="20" stroke="currentColor" className="text-muted/60" strokeWidth="3.5" fill="none" />
                        <circle cx="24" cy="24" r="20" stroke="currentColor" className="text-blue-500" strokeWidth="3.5" fill="none" strokeDasharray="125.6" strokeDashoffset="45" />
                      </svg>
                    </div>
                  </div>
                </div>

                {/* B1 / TOEFL */}
                <div className="bg-card p-4 rounded-xl border border-border/80 shadow-xs hover:shadow-md transition-all cursor-pointer group">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-amber-50 dark:bg-amber-950/50 rounded-lg flex items-center justify-center text-amber-600 dark:text-amber-400 font-extrabold text-xs border border-amber-200 dark:border-amber-800">
                        B1
                      </div>
                      <div>
                        <div className="font-bold text-foreground text-sm">17 {t("words").toLowerCase()}</div>
                        <div className="text-xs text-muted-foreground">{t("learnedCount", { learned: 6, total: 17 })}</div>
                      </div>
                    </div>
                    
                    {/* SVG Circular Ring */}
                    <div className="w-12 h-12 relative">
                      <svg className="transform -rotate-90 w-12 h-12">
                        <circle cx="24" cy="24" r="20" stroke="currentColor" className="text-muted/60" strokeWidth="3.5" fill="none" />
                        <circle cx="24" cy="24" r="20" stroke="currentColor" className="text-amber-500" strokeWidth="3.5" fill="none" strokeDasharray="125.6" strokeDashoffset="80" />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Filter Tabs & Toolbar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div className="flex items-center gap-1.5 bg-card p-1 rounded-xl border border-border/80 overflow-x-auto shadow-xs">
                <button
                  onClick={() => { setActiveFilter("weak"); setCurrentPage(1); }}
                  className={cn(
                    "px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 whitespace-nowrap transition-all",
                    activeFilter === "weak"
                      ? "bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800"
                      : "text-muted-foreground hover:bg-muted"
                  )}
                >
                  <AlertTriangle className="h-3.5 w-3.5" />
                  {t("weakTab")} ({weakWordsCount})
                </button>

                <button
                  onClick={() => { setActiveFilter("all"); setCurrentPage(1); }}
                  className={cn(
                    "px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap transition-all",
                    activeFilter === "all"
                      ? "bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800 font-bold"
                      : "text-muted-foreground hover:bg-muted"
                  )}
                >
                  {t("all")} ({totalWords})
                </button>

                <button
                  onClick={() => { setActiveFilter("learned"); setCurrentPage(1); }}
                  className={cn(
                    "px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap transition-all",
                    activeFilter === "learned"
                      ? "bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 font-bold"
                      : "text-muted-foreground hover:bg-muted"
                  )}
                >
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                  {t("masteredStatus")} ({learnedWords})
                </button>

                <button
                  onClick={() => { setActiveFilter("unlearned"); setCurrentPage(1); }}
                  className={cn(
                    "px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap transition-all",
                    activeFilter === "unlearned"
                      ? "bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800 font-bold"
                      : "text-muted-foreground hover:bg-muted"
                  )}
                >
                  {t("unlearned")} ({learningWords})
                </button>
              </div>

              {/* View Options & Search */}
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                    placeholder={t("searchPlaceholder")}
                    className="w-full sm:w-56 rounded-xl border border-border bg-card pl-8 pr-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <button className="p-2 border border-border/80 rounded-xl hover:bg-muted text-muted-foreground transition-colors" title="Bộ lọc">
                  <Filter className="h-4 w-4" />
                </button>
                <button className="p-2 border border-border/80 rounded-xl hover:bg-muted text-muted-foreground transition-colors" title="Xem dạng lưới">
                  <Grid className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Words Table */}
            <div className="rounded-2xl border border-border/80 bg-card overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-muted/40 border-b border-border/60 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    <tr>
                      <th className="py-3 px-4 w-10 text-center">
                        <input type="checkbox" className="rounded border-border text-emerald-600 focus:ring-emerald-500" />
                      </th>
                      <th className="py-3 px-4">{t("wordColumn")}</th>
                      <th className="py-3 px-4 w-36">{t("phoneticColumn")}</th>
                      <th className="py-3 px-4">{t("meaningColumn")}</th>
                      <th className="py-3 px-4 w-40">{t("statusColumn")}</th>
                      <th className="py-3 px-4 text-center w-24">Thao tác</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-border/60 text-xs">
                    {paginatedItems.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-muted-foreground font-medium">
                          {t("emptyTitle")}
                        </td>
                      </tr>
                    ) : (
                      paginatedItems.map((wordItem, index) => {
                        const globalIdx = (currentPage - 1) * PAGE_SIZE + index;
                        const isWeak = globalIdx < 3;
                        const isLearning = globalIdx === 3;
                        const isMastered = globalIdx >= 4;

                        return (
                          <tr key={wordItem.id} className="hover:bg-muted/30 transition-colors group">
                            <td className="py-3.5 px-4 text-center">
                              <input type="checkbox" className="rounded border-border text-emerald-600 focus:ring-emerald-500" />
                            </td>

                            <td className="py-3.5 px-4">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-foreground text-sm">{wordItem.word}</span>
                                <span className="text-[10px] text-muted-foreground font-medium">{wordItem.pos ?? "noun"}</span>
                              </div>
                              <div className="flex gap-1 mt-1">
                                <span className="text-[9px] font-semibold px-1.5 py-0.5 bg-muted text-muted-foreground rounded">IELTS</span>
                                <span className="text-[9px] font-semibold px-1.5 py-0.5 bg-muted text-muted-foreground rounded">TOEIC</span>
                              </div>
                            </td>

                            <td className="py-3.5 px-4">
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-muted-foreground">{wordItem.phonetic ?? "/ˈpɑː.spɔːt/"}</span>
                                <button
                                  onClick={() => handlePlayAudio(wordItem.word)}
                                  className={cn(
                                    "p-1 rounded-full hover:bg-emerald-50 dark:hover:bg-emerald-950/50 hover:text-emerald-600 transition",
                                    playingAudio === wordItem.word ? "text-emerald-600 animate-pulse" : "text-muted-foreground"
                                  )}
                                  title="Phát âm"
                                >
                                  <Volume2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </td>

                            <td className="py-3.5 px-4 text-foreground font-medium">
                              <p className="line-clamp-2">{wordItem.meaningVi}</p>
                            </td>

                            <td className="py-3.5 px-4">
                              {isWeak && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                                  <AlertTriangle className="h-3 w-3 text-amber-600" /> {t("weakWithScore", { score: 2 })}
                                </span>
                              )}
                              {isLearning && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
                                  <Clock className="h-3 w-3 text-blue-600" /> {t("learningWithScore", { score: 3 })}
                                </span>
                              )}
                              {isMastered && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                                  <CheckCircle2 className="h-3 w-3 text-emerald-600" /> {t("masteredWithScore", { score: 5 })}
                                </span>
                              )}
                            </td>

                            <td className="py-3.5 px-4 text-center">
                              <Link
                                href={withLocale("/flashcards")}
                                className="inline-flex items-center justify-center px-3 py-1 text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 rounded-lg transition"
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
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-border/60 bg-muted/20 text-xs">
                <div className="text-muted-foreground font-medium">
                  {t("showingRangeOfTotal", {
                    from: Math.min((currentPage - 1) * PAGE_SIZE + 1, filteredItems.length),
                    to: Math.min(currentPage * PAGE_SIZE, filteredItems.length),
                    total: filteredItems.length,
                  })}
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1.5 border border-border/80 rounded-lg font-medium text-foreground hover:bg-card disabled:opacity-50 disabled:cursor-not-allowed transition"
                  >
                    <ChevronLeft className="h-3.5 w-3.5 inline mr-1" /> {t("prev")}
                  </button>

                  {Array.from({ length: Math.min(5, totalPages) }).map((_, idx) => {
                    const pageNum = idx + 1;
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setCurrentPage(pageNum)}
                        className={cn(
                          "px-3 py-1.5 rounded-lg font-bold transition",
                          currentPage === pageNum
                            ? "bg-emerald-600 text-white shadow-xs"
                            : "border border-border/80 text-foreground hover:bg-card"
                        )}
                      >
                        {pageNum}
                      </button>
                    );
                  })}

                  {totalPages > 5 && <span className="px-1 text-muted-foreground">...</span>}

                  <button
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1.5 border border-border/80 rounded-lg font-medium text-foreground hover:bg-card disabled:opacity-50 disabled:cursor-not-allowed transition"
                  >
                    {t("next")} <ChevronRight className="h-3.5 w-3.5 inline ml-1" />
                  </button>
                </div>
              </div>
            </div>

          </div>
        </FeedWrapper>

      {/* Phase 5: Mobile Floating Action Button (FAB) */}
      <button
        onClick={() => setShowStudyModal(true)}
        className="lg:hidden fixed bottom-6 right-6 w-14 h-14 bg-emerald-600 text-white rounded-full shadow-lg flex items-center justify-center text-2xl z-40 hover:scale-110 active:scale-95 transition-transform"
        aria-label="Bắt đầu học"
      >
        <Plus className="h-7 w-7" />
      </button>

      {/* Phase 5: Mobile Bottom Sheet Study Menu Modal */}
      {showStudyModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-card border border-border rounded-2xl w-full max-w-md p-6 shadow-2xl animate-in slide-in-from-bottom duration-300">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-base font-bold text-foreground">{t("startStudyModalTitle")}</h3>
              <button
                onClick={() => setShowStudyModal(false)}
                className="p-1.5 hover:bg-muted rounded-full text-muted-foreground transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-2.5">
              <Link
                href={withLocale("/flashcards")}
                onClick={() => setShowStudyModal(false)}
                className="w-full p-3.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl flex items-center gap-3.5 hover:bg-amber-100 transition"
              >
                <div className="w-10 h-10 bg-amber-500 rounded-xl flex items-center justify-center text-white shrink-0">
                  <AlertTriangle className="h-5 w-5" />
                </div>
                <div className="text-left">
                  <div className="font-bold text-amber-900 dark:text-amber-300 text-sm">{t("weakWordsOptionTitle")}</div>
                  <div className="text-xs text-amber-700 dark:text-amber-400">{t("weakWordsOptionSubtitle", { count: weakWordsCount })}</div>
                </div>
              </Link>

              <Link
                href={withLocale("/flashcards")}
                onClick={() => setShowStudyModal(false)}
                className="w-full p-3.5 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-xl flex items-center gap-3.5 hover:bg-blue-100 transition"
              >
                <div className="w-10 h-10 bg-blue-500 rounded-xl flex items-center justify-center text-white shrink-0">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div className="text-left">
                  <div className="font-bold text-blue-900 dark:text-blue-300 text-sm">{t("newWordsOptionTitle")}</div>
                  <div className="text-xs text-blue-700 dark:text-blue-400">{t("newWordsOptionSubtitle", { count: 95 })}</div>
                </div>
              </Link>

              <Link
                href={withLocale("/flashcards")}
                onClick={() => setShowStudyModal(false)}
                className="w-full p-3.5 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 rounded-xl flex items-center gap-3.5 hover:bg-indigo-100 transition"
              >
                <div className="w-10 h-10 bg-indigo-500 rounded-xl flex items-center justify-center text-white shrink-0">
                  <RotateCw className="h-5 w-5" />
                </div>
                <div className="text-left">
                  <div className="font-bold text-indigo-900 dark:text-indigo-300 text-sm">{t("continueLearningOptionTitle")}</div>
                  <div className="text-xs text-indigo-700 dark:text-indigo-400">{t("continueLearningOptionSubtitle", { count: learningWords })}</div>
                </div>
              </Link>

              <Link
                href={withLocale("/flashcards")}
                onClick={() => setShowStudyModal(false)}
                className="w-full p-3.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl flex items-center gap-3.5 hover:bg-emerald-100 transition"
              >
                <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center text-white shrink-0">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
                <div className="text-left">
                  <div className="font-bold text-emerald-900 dark:text-emerald-300 text-sm">{t("reviewOptionTitle")}</div>
                  <div className="text-xs text-emerald-700 dark:text-emerald-400">{t("reviewOptionSubtitle", { count: learnedWords })}</div>
                </div>
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
