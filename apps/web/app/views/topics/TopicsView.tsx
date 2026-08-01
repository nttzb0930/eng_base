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
  User,
  Users,
  UserCheck,
  HeartHandshake,
  Smile,
  Eye,
  Heart,
  Activity,
  Briefcase,
  Utensils,
  Home,
  Laptop,
  GraduationCap,
  ShoppingBag,
  CloudSun,
  Dumbbell,
  Plane,
];

function getTopicIcon(slug: string, title: string, index: number) {
  const text = `${slug} ${title}`.toLowerCase();
  const matched = TOPIC_ICON_RULES.find(([keywords]) =>
    keywords.some((kw) => text.includes(kw))
  );
  return matched ? matched[1] : FALLBACK_ICONS[index % FALLBACK_ICONS.length];
}

type FilterStatus = "all" | "learning" | "mastered" | "weak";

export function TopicsView() {
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
  const counts = useMemo(
    () => ({
      all: topics.length,
      learning: topics.filter((topic) => topic.learning > 0).length,
      mastered: topics.filter(
        (topic) => topic.total > 0 && topic.mastered === topic.total
      ).length,
      weak: topics.filter((topic) => topic.weak > 0).length,
    }),
    [topics]
  );

  // Filtered list
  const filteredTopics = useMemo(() => {
    return topics.filter((topic) => {
      // Search filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchesName =
          topic.title.toLowerCase().includes(query) ||
          topic.slug.toLowerCase().includes(query) ||
          (topic.description &&
            topic.description.toLowerCase().includes(query));
        if (!matchesName) return false;
      }

      // Status filter
      if (activeFilter === "all") return true;
      if (activeFilter === "learning") return topic.learning > 0;
      if (activeFilter === "mastered")
        return topic.total > 0 && topic.mastered === topic.total;
      if (activeFilter === "weak") return topic.weak > 0;
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
    setVisibleCount((prev) =>
      Math.min(prev + PAGE_SIZE, filteredTopics.length)
    );
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
            className="text-muted-foreground group -ml-2.5 inline-flex items-center gap-1 rounded-lg px-2.5 py-1 transition-colors hover:bg-orange-50 hover:text-orange-600 dark:hover:bg-orange-950/40 dark:hover:text-orange-400"
          >
            <ChevronLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5" />
            <span>{nav("learn")}</span>
          </Link>
          <span className="text-border">/</span>
          <span className="font-semibold text-orange-600 dark:text-orange-400">
            {t("byTopic")}
          </span>
        </div>

        {/* Header */}
        <header className="mb-7 max-w-2xl">
          <p className="eyebrow inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-orange-600 dark:text-orange-400">
            <Compass className="h-4 w-4" />
            <span>{t("exploreByTopic")}</span>
          </p>
          <h1 className="text-foreground mt-2.5 text-3xl font-semibold tracking-tight sm:text-4xl">
            {t("title")}
          </h1>
          <p className="text-muted-foreground mt-3 max-w-[65ch] text-sm leading-relaxed">
            {t("topicPageDescription")}
          </p>
        </header>

        <DiscoveryTabs active="topics" topicCount={topics.length} />

        {/* Filter chips & Search bar */}
        <div className="mb-7 mt-6 flex flex-wrap items-center gap-3">
          <button
            onClick={() => handleFilterChange("all")}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-3.5 py-1 text-xs font-semibold shadow-sm transition-all",
              activeFilter === "all"
                ? "border border-orange-500/40 bg-orange-500/10 text-orange-600 dark:text-orange-400"
                : "border-border bg-card text-muted-foreground hover:bg-muted border"
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
                : "border-border bg-card text-muted-foreground hover:bg-muted border"
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
                : "border-border bg-card text-muted-foreground hover:bg-muted border"
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
                : "border-border bg-card text-muted-foreground hover:bg-muted border"
            )}
          >
            {t("weakTab")} · {counts.weak}
          </button>

          <div className="relative ml-auto w-full sm:w-auto">
            <Search className="text-muted-foreground pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder={t("searchPlaceholder")}
              className="border-border bg-card text-foreground placeholder:text-muted-foreground w-full rounded-xl border py-1.5 pl-8 pr-3.5 text-xs focus:outline-none focus:ring-2 focus:ring-orange-500 sm:w-52"
            />
          </div>
        </div>

        {/* Topics Section */}
        <section className="mt-6">
          {filteredTopics.length === 0 ? (
            <div className="border-border bg-card rounded-2xl border border-dashed p-8 text-center shadow-sm">
              <Sparkles
                className="text-primary mx-auto h-9 w-9"
                aria-hidden="true"
              />
              <p className="text-foreground mt-4 font-semibold">
                {t("emptyTitle")}
              </p>
              <p className="text-muted-foreground mt-2 text-sm">
                {t("emptyDescription")}
              </p>
            </div>
          ) : (
            <>
              <div className="grid gap-5 md:grid-cols-2">
                {displayedTopics.map((topic, index) => {
                  const learnedPercent = getPercent(topic.learned, topic.total);
                  const isWeak = topic.weak > 0;

                  const Icon = getTopicIcon(topic.slug, topic.title, index);

                  return (
                    <Link
                      key={topic.id}
                      href={withLocale(`/topics/${topic.slug}`)}
                      className="bg-card border-border/80 group relative flex min-h-[175px] flex-col justify-between rounded-2xl border p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-orange-300 hover:shadow-md dark:hover:border-orange-700"
                    >
                      <div>
                        {/* Top Icon & Badge */}
                        <div className="flex items-start justify-between">
                          <div className="shadow-xs flex h-11 w-11 items-center justify-center rounded-xl border border-orange-200 bg-orange-50 text-orange-600 dark:border-orange-800 dark:bg-orange-950/50 dark:text-orange-400">
                            <Icon className="h-5.5 w-5.5 stroke-[2.2]" />
                          </div>
                          {isWeak && (
                            <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-xs font-bold text-amber-600 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-400">
                              <AlertTriangle className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />{" "}
                              {t("weakStatus")}
                            </span>
                          )}
                        </div>

                        {/* Title & Subtitle */}
                        <h4 className="text-foreground mt-3 text-lg font-semibold leading-tight transition-colors group-hover:text-orange-600 dark:group-hover:text-orange-400">
                          {topic.title}
                        </h4>
                        <p className="text-muted-foreground mt-1 text-xs">
                          {topic.total} {t("words").toLowerCase()}
                        </p>
                      </div>

                      {/* Progress Bar & Bottom CTA */}
                      <div className="mt-4 pt-1">
                        <div className="bg-muted/80 h-1.5 w-full overflow-hidden rounded-full">
                          <div
                            className={cn(
                              "h-full rounded-full transition-all duration-300",
                              isWeak
                                ? "bg-gradient-to-r from-amber-500 to-amber-400"
                                : learnedPercent > 50
                                  ? "bg-gradient-to-r from-emerald-500 to-teal-400"
                                  : "bg-gradient-to-r from-blue-500 to-indigo-400"
                            )}
                            style={{
                              width: `${Math.max(learnedPercent, topic.total > 0 ? 3 : 0)}%`,
                            }}
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
                            {isWeak
                              ? t("needsReview")
                              : learnedPercent === 0
                                ? t("start")
                                : t("continue")}
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
                    className="border-border bg-card text-foreground hover:bg-muted hover:border-foreground/20 inline-flex items-center gap-1.5 rounded-full border px-6 py-2.5 text-xs font-bold shadow-sm transition active:scale-95"
                  >
                    {t("loadMoreTopics", { count: nextAddCount })}
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                  <p className="text-muted-foreground text-[11px]">
                    {t("showingTopics", {
                      displayed: displayedTopics.length,
                      total: filteredTopics.length,
                    })}
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
