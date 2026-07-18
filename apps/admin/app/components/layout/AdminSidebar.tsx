"use client";

import Link from "next/link";
import { ChevronLeft, ChevronRight, GraduationCap } from "lucide-react";

import { Button } from "@/app/components/ui/button";
import { cn } from "@/app/utils/cn";

import { adminNavigation } from "./admin-navigation";

type AdminSidebarProps = {
  pathname: string;
  isCollapsed: boolean;
  isMobileOpen: boolean;
  onCloseMobile(): void;
  onToggleCollapsed(): void;
};

export function AdminSidebar({
  pathname,
  isCollapsed,
  isMobileOpen,
  onCloseMobile,
  onToggleCollapsed,
}: AdminSidebarProps) {
  return (
    <aside
      className={cn(
        "fixed inset-y-0 left-0 z-40 flex flex-col border-r border-zinc-200 bg-white transition-all duration-300 ease-in-out md:static",
        isCollapsed ? "w-0 md:w-20" : "w-64",
        isMobileOpen ? "w-64 translate-x-0" : "-translate-x-full md:translate-x-0",
      )}
    >
      <div className="flex h-16 shrink-0 items-center gap-2.5 border-b border-zinc-200 px-6">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-zinc-950 bg-zinc-900 text-zinc-50 shadow-sm">
          <GraduationCap className="h-5 w-5" />
        </div>
        <span
          className={cn(
            "truncate text-lg font-black tracking-tight text-zinc-900 transition-opacity duration-300 ease-in-out",
            isCollapsed && "pointer-events-none md:opacity-0",
          )}
        >
          Lingo Admin
        </span>
      </div>

      <nav className="min-h-0 flex-1 space-y-1.5 overflow-y-auto p-4">
        {adminNavigation.map((item) => {
          const Icon = item.icon;
          const isActive = pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onCloseMobile}
              title={isCollapsed ? item.label : undefined}
              className={cn(
                "flex w-full cursor-pointer items-center rounded-lg px-4 py-2.5 text-sm font-semibold transition-all duration-200",
                isActive
                  ? "bg-zinc-100 font-bold text-zinc-900"
                  : "text-zinc-650 hover:bg-zinc-50 hover:text-zinc-900",
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span
                className={cn(
                  "truncate text-nowrap transition-all duration-300 ease-in-out",
                  isCollapsed
                    ? "pointer-events-none ml-0 md:max-w-0 md:opacity-0"
                    : "ml-3 max-w-[180px] opacity-100",
                )}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto shrink-0 space-y-4 border-t border-zinc-200 bg-zinc-50/50 p-4">
        <div className="hidden md:block">
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggleCollapsed}
            className="flex h-8 w-full cursor-pointer items-center justify-start rounded-lg px-2.5 text-zinc-500 transition-all duration-200 hover:bg-zinc-100 hover:text-zinc-900 active:scale-95"
          >
            {isCollapsed ? (
              <ChevronRight className="h-4 w-4 shrink-0" />
            ) : (
              <ChevronLeft className="h-4 w-4 shrink-0" />
            )}
            <span
              className={cn(
                "truncate text-nowrap text-xs font-semibold transition-all duration-300 ease-in-out",
                isCollapsed
                  ? "ml-0 md:max-w-0 md:opacity-0"
                  : "ml-2.5 max-w-[150px] opacity-100",
              )}
            >
              Thu gọn menu
            </span>
          </Button>
        </div>
      </div>
    </aside>
  );
}
