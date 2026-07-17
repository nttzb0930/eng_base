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
        "left-0 top-0 flex h-full flex-col border-r bg-card px-4 lg:fixed lg:w-[264px]",
        className
      )}
    >
      <Link href={withLocale("/dashboard")}>
        <div className="flex items-center gap-3 px-2 pb-8 pt-7">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-brand to-brand-dark text-white shadow-brand">
            <Sparkles className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-foreground">VoCaBu</h1>
            <p className="text-[11px] font-medium text-muted-foreground">English, every day</p>
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
        />
        <SidebarItem
          label={t("topics")}
          href={withLocale("/topics")}
          iconSrc="/learn.svg"
        />
        <SidebarItem
          label={t("savedWords")}
          href={withLocale("/saved-words")}
          iconSrc="/heart.svg"
        />
        <SidebarItem
          label={t("practice")}
          href={withLocale("/practice")}
          iconSrc="/learn.svg"
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

      <div className="flex items-center justify-between gap-2 border-t py-5 px-2">
        {status === "loading" ? (
          <div className="flex items-center gap-x-2 animate-pulse w-full py-1">
            <div className="h-9 w-9 bg-slate-200 rounded-full flex-shrink-0" />
            <div className="flex flex-col gap-y-1.5 flex-1">
              <div className="h-3.5 bg-slate-200 rounded w-24" />
              <div className="h-2.5 bg-slate-200 rounded w-16" />
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-x-2 min-w-0">
              <Avatar className="h-9 w-9 shrink-0 border border-primary/15 bg-secondary">
                <AvatarFallback className="bg-secondary text-sm font-semibold text-secondary-foreground">
                  {displayName.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col min-w-0">
                <span className="max-w-[120px] truncate text-sm font-semibold text-foreground" title={displayName}>
                  {displayName}
                </span>
                <span className="text-[11px] font-medium text-muted-foreground">{t("learner")}</span>
              </div>
            </div>

            <Button
              onClick={() => { void logout().finally(() => window.location.replace("/")); }}
              variant="ghost"
              size="icon"
              className="h-9 w-9 shrink-0 text-muted-foreground hover:bg-rose-50 hover:text-rose-600"
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
