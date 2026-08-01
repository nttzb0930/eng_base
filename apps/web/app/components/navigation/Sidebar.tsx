"use client";

import { LogOut, Sparkles } from "lucide-react";
import { LocalizedLink as Link } from "@/app/components/navigation/LocalizedLink";
import { useTranslations } from "next-intl";

import { withLocale } from "@/app/i18n/paths";
import { cn } from "@/app/utils/cn";

import { SidebarItem } from "./SidebarItem";
import { Avatar, AvatarFallback } from "@/app/components/ui/avatar";
import { Button } from "@/app/components/ui/button";
import { useAuth } from "@/app/features/auth/hooks/use-auth";

const appName = process.env.NEXT_PUBLIC_APP_NAME?.trim() || "English Base";

type SidebarProps = {
  className?: string;
};

export const Sidebar = ({ className }: SidebarProps) => {
  const t = useTranslations("navigation");
  const { logout, user, status } = useAuth();
  const displayName = user?.fullName || user?.username || t("learner");

  return (
    <div
      className={cn(
        "bg-card left-0 top-0 flex h-full flex-col border-r px-4 lg:fixed lg:w-[264px]",
        className
      )}
    >
      <Link href={withLocale("/dashboard")}>
        <div className="flex items-center gap-3 px-2 pb-8 pt-7">
          <span className="from-brand to-brand-dark shadow-brand grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br text-white">
            <Sparkles className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <h1 className="text-foreground text-xl font-semibold tracking-tight">
              {appName}
            </h1>
            <p className="text-muted-foreground text-[11px] font-medium">
              English, every day
            </p>
          </div>
        </div>
      </Link>

      <div className="flex flex-1 flex-col gap-y-1">
        <SidebarItem
          label={t("dashboard")}
          href={withLocale("/dashboard")}
          iconSrc="/points.svg"
        />
        <SidebarItem
          label={t("learn")}
          href={withLocale("/learn")}
          iconSrc="/learn.svg"
          activeHrefs={["/learn", "/practice", "/reading"]}
        />
        <SidebarItem
          label={t("savedWords")}
          href={withLocale("/saved-words")}
          iconSrc="/heart.svg"
        />
        <SidebarItem
          label={t("flashcards")}
          href={withLocale("/flashcards")}
          iconSrc="/points.svg"
        />
        <SidebarItem
          label={t("leaderboard")}
          href={withLocale("/leaderboard")}
          iconSrc="/leaderboard.svg"
        />
      </div>

      <div className="flex items-center justify-between gap-2 border-t px-2 py-5">
        {status === "loading" ? (
          <div className="flex w-full animate-pulse items-center gap-x-2 py-1">
            <div className="h-9 w-9 flex-shrink-0 rounded-full bg-slate-200" />
            <div className="flex flex-1 flex-col gap-y-1.5">
              <div className="h-3.5 w-24 rounded bg-slate-200" />
              <div className="h-2.5 w-16 rounded bg-slate-200" />
            </div>
          </div>
        ) : (
          <>
            <div className="flex min-w-0 items-center gap-x-2">
              <Avatar className="border-primary/15 bg-secondary h-9 w-9 shrink-0 border">
                <AvatarFallback className="bg-secondary text-secondary-foreground text-sm font-semibold">
                  {displayName.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex min-w-0 flex-col">
                <span
                  className="text-foreground max-w-[120px] truncate text-sm font-semibold"
                  title={displayName}
                >
                  {displayName}
                </span>
                <span className="text-muted-foreground text-[11px] font-medium">
                  {t("learner")}
                </span>
              </div>
            </div>

            <Button
              onClick={() => {
                void logout().finally(() => window.location.replace("/"));
              }}
              variant="ghost"
              size="icon"
              className="text-muted-foreground h-9 w-9 shrink-0 hover:bg-rose-50 hover:text-rose-600"
              title={t("logout")}
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </>
        )}
      </div>
    </div>
  );
};
