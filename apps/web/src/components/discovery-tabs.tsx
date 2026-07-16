import { Grid2X2, Layers3 } from "lucide-react";
import { LocalizedLink as Link } from "@/src/components/localized-link";
import { withLocale } from "@/src/lib/i18n/paths";
import { cn } from "@/src/lib/utils";

type DiscoveryTabsProps = {
  active: "learn" | "topics";
  learnLabel: string;
  topicsLabel: string;
  levelCount?: number;
  topicCount?: number;
};

const tabs = [
  { key: "learn", href: "/learn", Icon: Layers3 },
  { key: "topics", href: "/topics", Icon: Grid2X2 },
] as const;

export function DiscoveryTabs({
  active,
  learnLabel,
  topicsLabel,
  levelCount,
  topicCount,
}: DiscoveryTabsProps) {
  return (
    <nav
      aria-label={`${learnLabel} / ${topicsLabel}`}
      className="mb-7 inline-flex rounded-xl border bg-card p-1 shadow-sm"
    >
      {tabs.map(({ key, href, Icon }) => {
        const selected = active === key;
        const label = key === "learn" ? learnLabel : topicsLabel;
        const count = key === "learn" ? levelCount : topicCount;

        return (
          <Link
            key={key}
            href={withLocale(href)}
            aria-current={selected ? "page" : undefined}
            className={cn(
              "inline-flex min-h-10 items-center gap-2 rounded-lg px-3 text-sm font-semibold transition-colors sm:px-4",
              selected
                ? "bg-foreground text-background"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <Icon className="h-4 w-4" aria-hidden="true" />
            {label}
            {typeof count === "number" && (
              <span
                className={cn(
                  "tabular rounded-md px-1.5 py-0.5 text-[11px]",
                  selected ? "bg-white/15 text-white" : "bg-muted text-muted-foreground"
                )}
              >
                {count}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
