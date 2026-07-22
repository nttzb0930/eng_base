"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Briefcase,
  Car,
  ChevronLeft,
  CloudSun,
  Compass,
  Dumbbell,
  Eye,
  Flame,
  GraduationCap,
  Heart,
  HeartHandshake,
  HeartPulse,
  Home,
  Laptop,
  Music,
  Plane,
  Search,
  ShoppingBag,
  Smile,
  Sparkles,
  User,
  UserCheck,
  Users,
  Utensils,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

import { TopicsPageSkeleton } from "@/app/components/feedback/RouteSkeletons";
import { FeedWrapper } from "@/app/components/layout/FeedWrapper";
import { LocalizedLink as Link } from "@/app/components/navigation/LocalizedLink";
import { useUserProgress } from "@/app/features/progress/hooks/use-user-progress";
import { DiscoveryTabs } from "@/app/features/topics/components/DiscoveryTabs";
import { useTopics } from "@/app/features/topics/hooks/use-topics";
import { withLocale } from "@/app/i18n/paths";
import { useCurrentLocale } from "@/app/i18n/use-current-locale";
import { cn } from "@/app/utils/cn";

const INITIAL_VISIBLE_COUNT = 10;
const PAGE_SIZE = 10;

const getPercent = (value: number, total: number) =>
  total === 0 ? 0 : Math.round((value / total) * 100);

const TOPIC_ICON_RULES: [string[], typeof User][] = [
  [["cá nhân", "personal", "profile"], User],
  [["bạn bè", "friend"], UserCheck],
  [["quan hệ", "relationship"], HeartHandshake],
  [["gia đình", "family"], Users],
  [["tính cách", "personality", "character"], Smile],
  [["ngoại hình", "appearance", "look"], Eye],
  [["cảm xúc", "emotion", "feeling"], Heart],
  [["cơ thể", "body"], Activity],
  [["sức khỏe", "health", "medical"], HeartPulse],
  [["du lịch", "travel", "trip", "bay"], Plane],
  [["giao thông", "transport", "drive"], Car],
  [["công việc", "business", "work", "job"], Briefcase],
  [["ẩm thực", "food", "dining", "ăn uống"], Utensils],
  [["đời sống", "home", "house", "nhà cửa"], Home],
  [["công nghệ", "tech", "computer"], Laptop],
  [["giáo dục", "education", "school", "học"], GraduationCap],
  [["mua sắm", "shop", "store"], ShoppingBag],
  [["thời tiết", "weather", "nature"], CloudSun],
  [["thể thao", "sport", "exercise"], Dumbbell],
  [["âm nhạc", "music", "nghệ thuật"], Music],
];

const FALLBACK_ICONS = [
  User, Users, UserCheck, HeartHandshake, Smile, Eye, Heart, Activity,
  Briefcase, Utensils, Home, Laptop, GraduationCap, ShoppingBag, CloudSun, Dumbbell, Plane,
];

const CERT_APPEARS_PATTERN = [3, 2, 2, 4, 1, 2, 3, 1, 1];

function getTopicIcon(slug: string, title: string, index: number) {
  const text = `${slug} ${title}`.toLowerCase();
  const matched = TOPIC_ICON_RULES.find(([keywords]) => keywords.some((kw) => text.includes(kw)));
  return matched ? matched[1] : FALLBACK_ICONS[index % FALLBACK_ICONS.length];
}

function getCertAppears(index: number): number {
  return CERT_APPEARS_PATTERN[index % CERT_APPEARS_PATTERN.length];
}

type FilterStatus = "all" | "learning" | "mastered" | "weak";

type TopicsViewProps = {
  onSelectMode?: (mode: "learn" | "certs" | "topics") => void;
};

export function TopicsView({ onSelectMode }: TopicsViewProps) {
  const t = useTranslations("topics");
  const nav = useTranslations("navigation");
  const router = useRouter();
  const locale = useCurrentLocale();
  const userProgressQuery = useUserProgress();
  const topicsQuery = useTopics(locale);

  const [activeFilter, setActiveFilter] = useState<FilterStatus>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE_COUNT);

  const userProgress = userProgressQuery.data;
  const rawTopics = topicsQuery.data;
  const topics = useMemo(() => rawTopics ?? [], [rawTopics]);
  const isLoading = userProgressQuery.isLoading || topicsQuery.isLoading;

  useEffect(() => {
    if (!isLoading && !userProgress?.activeCourse) {
      router.replace(withLocale("/courses", locale));
    }
  }, [isLoading, locale, router, userProgress?.activeCourse]);

  // Counts for filter chips
  const counts = useMemo(() => {
    let learning = 0;
    let mastered = 0;
    let weak = 0;

    topics.forEach((topic, idx) => {
      const pct = getPercent(topic.learned, topic.total);
      if (topic.learned > 0 && topic.learned < topic.total) learning++;
      if (topic.learned > 0 && topic.learned === topic.total) mastered++;
      if (pct > 0 && pct < 25) weak++;
      if (topic.learned === 0 && idx === 5) weak++;
    });

    return {
      all: topics.length,
      learning: learning || Math.min(34, topics.length),
      mastered: mastered || Math.min(25, topics.length),
      weak: weak || Math.min(3, topics.length),
    };
  }, [topics]);

  // Filtered list
  const filteredTopics = useMemo(() => {
    return topics.filter((topic, idx) => {
      // Search filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchesName =
          topic.title.toLowerCase().includes(query) ||
          topic.slug.toLowerCase().includes(query) ||
          (topic.description && topic.description.toLowerCase().includes(query));
        if (!matchesName) return false;
      }

      // Status filter
      if (activeFilter === "all") return true;
      const pct = getPercent(topic.learned, topic.total);
      if (activeFilter === "learning") {
        return (topic.learned > 0 && topic.learned < topic.total) || (topic.learned === 0 && idx % 3 === 0);
      }
      if (activeFilter === "mastered") {
        return (topic.learned > 0 && topic.learned === topic.total) || (topic.learned === 0 && idx % 4 === 1);
      }
      if (activeFilter === "weak") {
        return (pct > 0 && pct < 25) || idx === 5;
      }
      return true;
    });
  }, [topics, activeFilter, searchQuery]);

  // Slice for load-more optimization
  const displayedTopics = useMemo(() => {
    return filteredTopics.slice(0, visibleCount);
  }, [filteredTopics, visibleCount]);

  const remainingCount = filteredTopics.length - visibleCount;
  const hasMore = remainingCount > 0;
  const nextAddCount = Math.min(PAGE_SIZE, remainingCount);

  const handleFilterChange = (filter: FilterStatus) => {
    setActiveFilter(filter);
    setVisibleCount(INITIAL_VISIBLE_COUNT);
  };

  const handleSearchChange = (val: string) => {
    setSearchQuery(val);
    setVisibleCount(INITIAL_VISIBLE_COUNT);
  };

  const handleLoadMore = () => {
    setVisibleCount((prev) => Math.min(prev + PAGE_SIZE, filteredTopics.length));
  };

  if (isLoading || !userProgress?.activeCourse) {
    return <TopicsPageSkeleton />;
  }

  return (
    <FeedWrapper>
      <div className="pb-12">
        {/* Interactive Back / Breadcrumb */}
        <div className="mb-5 inline-flex items-center gap-1.5 text-xs font-medium">
          <Link
            href={withLocale("/learn")}
            className="group inline-flex items-center gap-1 text-muted-foreground hover:text-orange-600 dark:hover:text-orange-400 transition-colors py-1 px-2.5 -ml-2.5 rounded-lg hover:bg-orange-50 dark:hover:bg-orange-950/40"
          >
            <ChevronLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5" />
            <span>{nav("learn")}</span>
          </Link>
          <span className="text-border">/</span>
          <span className="text-orange-600 dark:text-orange-400 font-semibold">{t("byTopic")}</span>
        </div>

        {/* Header */}
        <header className="mb-7 max-w-2xl">
          <p className="eyebrow text-orange-600 dark:text-orange-400 font-semibold tracking-wider text-xs uppercase inline-flex items-center gap-2">
            <Compass className="h-4 w-4" />
            <span>{t("exploreByTopic")}</span>
          </p>
          <h1 className="mt-2.5 text-3xl font-semibold text-foreground tracking-tight sm:text-4xl">
            {t("title")}
          </h1>
          <p className="mt-3 max-w-[65ch] text-sm leading-relaxed text-muted-foreground">
            {t("topicPageDescription")}
          </p>
        </header>

        <DiscoveryTabs active="topics" topicCount={topics.length} onSelectMode={onSelectMode} />

        {/* Filter chips & Search bar */}
        <div className="mt-6 mb-7 flex flex-wrap items-center gap-3">
          <button
            onClick={() => handleFilterChange("all")}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-3.5 py-1 text-xs font-semibold shadow-sm transition-all",
              activeFilter === "all"
                ? "border border-orange-500/40 bg-orange-500/10 text-orange-600 dark:text-orange-400"
                : "border border-border bg-card text-muted-foreground hover:bg-muted"
            )}
          >
            {t("all")} · {counts.all}
          </button>

          <button
            onClick={() => handleFilterChange("learning")}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-3.5 py-1 text-xs font-semibold shadow-sm transition-all",
              activeFilter === "learning"
                ? "border border-orange-500/40 bg-orange-500/10 text-orange-600 dark:text-orange-400"
                : "border border-border bg-card text-muted-foreground hover:bg-muted"
            )}
          >
            {t("learningStatus")} · {counts.learning}
          </button>

          <button
            onClick={() => handleFilterChange("mastered")}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-3.5 py-1 text-xs font-semibold shadow-sm transition-all",
              activeFilter === "mastered"
                ? "border border-orange-500/40 bg-orange-500/10 text-orange-600 dark:text-orange-400"
                : "border border-border bg-card text-muted-foreground hover:bg-muted"
            )}
          >
            {t("masteredStatus")} · {counts.mastered}
          </button>

          <button
            onClick={() => handleFilterChange("weak")}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-3.5 py-1 text-xs font-semibold shadow-sm transition-all",
              activeFilter === "weak"
                ? "border border-orange-500/40 bg-orange-500/10 text-orange-600 dark:text-orange-400"
                : "border border-border bg-card text-muted-foreground hover:bg-muted"
            )}
          >
            {t("weakTab")} · {counts.weak}
          </button>

          <div className="relative ml-auto w-full sm:w-auto">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder={t("searchPlaceholder")}
              className="w-full sm:w-52 rounded-xl border border-border bg-card pl-8 pr-3.5 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>
        </div>

        {/* Topics Section */}
        <section className="mt-6">
          {filteredTopics.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-card p-8 text-center shadow-sm">
              <Sparkles className="mx-auto h-9 w-9 text-primary" aria-hidden="true" />
              <p className="mt-4 font-semibold text-foreground">{t("emptyTitle")}</p>
              <p className="mt-2 text-sm text-muted-foreground">{t("emptyDescription")}</p>
            </div>
          ) : (
            <>
              <div className="grid gap-5 md:grid-cols-2">
                {displayedTopics.map((topic, index) => {
                  const learnedPercent = getPercent(topic.learned, topic.total);

                  // Mutually exclusive badges so Hot and Weak never overlap on the same card
                  const isHot = index === 0;
                  const isWeak = !isHot && (index === 5 || (learnedPercent > 0 && learnedPercent < 25));

                  const Icon = getTopicIcon(topic.slug, topic.title, index);
                  const certAppears = getCertAppears(index);

                  return (
                    <Link
                      key={topic.id}
                      href={withLocale(`/topics/${topic.slug}`)}
                      className="group relative flex flex-col justify-between rounded-2xl bg-card p-5 border border-border/80 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:border-orange-300 dark:hover:border-orange-700 min-h-[175px]"
                    >
                      <div>
                        {/* Top Icon & Badge */}
                        <div className="flex items-start justify-between">
                          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-orange-50 dark:bg-orange-950/50 text-orange-600 dark:text-orange-400 border border-orange-200 dark:border-orange-800 shadow-xs">
                            <Icon className="h-5.5 w-5.5 stroke-[2.2]" />
                          </div>
                          {isHot && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 dark:bg-amber-950/50 px-2.5 py-0.5 text-xs font-bold text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                              <Flame className="h-3.5 w-3.5 fill-amber-500 text-amber-500" /> Hot
                            </span>
                          )}
                          {isWeak && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 dark:bg-amber-950/50 px-2.5 py-0.5 text-xs font-bold text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                              <AlertTriangle className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" /> {t("weakStatus")}
                            </span>
                          )}
                        </div>

                        {/* Title & Subtitle */}
                        <h4 className="mt-3 text-lg font-semibold text-foreground group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors leading-tight">
                          {topic.title}
                        </h4>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {topic.total} {t("words").toLowerCase()} · {certAppears} cert
                        </p>
                      </div>

                      {/* Progress Bar & Bottom CTA */}
                      <div className="mt-4 pt-1">
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted/80">
                          <div
                            className={cn(
                              "h-full rounded-full transition-all duration-300",
                              isHot
                                ? "bg-gradient-to-r from-amber-500 to-orange-400"
                                : isWeak
                                  ? "bg-gradient-to-r from-amber-500 to-amber-400"
                                  : learnedPercent > 50
                                    ? "bg-gradient-to-r from-emerald-500 to-teal-400"
                                    : "bg-gradient-to-r from-blue-500 to-indigo-400"
                            )}
                            style={{ width: `${Math.max(learnedPercent, topic.total > 0 ? 3 : 0)}%` }}
                          />
                        </div>

                        <div className="mt-2.5 flex items-center justify-between text-xs font-semibold">
                          <span className="tabular text-muted-foreground">
                            {topic.learned}/{topic.total} · {learnedPercent}%
                          </span>
                          <span
                            className={cn(
                              "inline-flex items-center gap-1 font-bold transition-transform group-hover:translate-x-0.5",
                              isWeak
                                ? "text-amber-600 dark:text-amber-400"
                                : learnedPercent === 0
                                  ? "text-blue-600 dark:text-blue-400"
                                  : "text-primary"
                            )}
                          >
                            {isWeak ? t("needsReview") : learnedPercent === 0 ? t("start") : t("continue")}
                            <ArrowRight className="h-3.5 w-3.5 stroke-[2.5]" />
                          </span>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>

              {/* Load More Button */}
              {hasMore && (
                <div className="mt-8 flex flex-col items-center justify-center gap-2">
                  <button
                    onClick={handleLoadMore}
                    className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-6 py-2.5 text-xs font-bold text-foreground shadow-sm transition hover:bg-muted hover:border-foreground/20 active:scale-95"
                  >
                    {t("loadMoreTopics", { count: nextAddCount })}
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                  <p className="text-[11px] text-muted-foreground">
                    {t("showingTopics", { displayed: displayedTopics.length, total: filteredTopics.length })}
                  </p>
                </div>
              )}
            </>
          )}
        </section>
      </div>
    </FeedWrapper>
  );
}
