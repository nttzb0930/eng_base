import { BookOpen, Headphones, LayoutDashboard } from "lucide-react";
import { useTranslations } from "next-intl";

import { LocalizedLink as Link } from "@/app/components/navigation/LocalizedLink";
import { cn } from "@/app/utils/cn";

type ToeicSection = "overview" | "listening" | "reading";

type ToeicSectionNavProps = {
  active: ToeicSection;
};

const sections = [
  {
    key: "overview",
    href: "/learn/cert/toeic",
    Icon: LayoutDashboard,
  },
  {
    key: "listening",
    href: "/learn/cert/toeic/listening?mode=level&scope=full",
    Icon: Headphones,
  },
  {
    key: "reading",
    href: "/learn/cert/toeic/reading?scope=full",
    Icon: BookOpen,
  },
] as const;

export function ToeicSectionNav({ active }: ToeicSectionNavProps) {
  const t = useTranslations("toeic.navigation");

  return (
    <nav aria-label={t("label")} className="mt-6">
      <div className="border-border/80 bg-card inline-flex max-w-full flex-wrap items-center gap-1 rounded-xl border p-1 shadow-sm">
        {sections.map(({ key, href, Icon }) => {
          const selected = key === active;

          return (
            <Link
              key={key}
              href={href}
              aria-current={selected ? "page" : undefined}
              className={cn(
                "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-4 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2",
                selected
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "text-muted-foreground hover:bg-emerald-50 hover:text-emerald-700 dark:hover:bg-emerald-950/50 dark:hover:text-emerald-300"
              )}
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
              {t(key)}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
