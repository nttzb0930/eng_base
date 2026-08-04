"use client";

import { GraduationCap } from "lucide-react";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from "@/app/components/ui/sheet";
import { cn } from "@/app/utils/cn";

import { AdminNavigationContent } from "./AdminNavigationContent";

const appName = process.env.NEXT_PUBLIC_APP_NAME?.trim() || "English Base";

type AdminSidebarProps = {
  isCollapsed: boolean;
  isMobileOpen: boolean;
  onCloseMobile(): void;
  pathname: string;
};

function SidebarBrand({ collapsed = false }: { collapsed?: boolean }) {
  return (
    <div
      className={cn(
        "flex h-16 items-center border-b px-3",
        collapsed ? "justify-center" : "gap-3 px-5",
      )}
    >
      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
        <GraduationCap className="size-5" />
      </span>
      {collapsed ? null : (
        <span className="min-w-0">
          <span className="block truncate text-sm font-semibold">{appName}</span>
          <span className="block text-xs text-muted-foreground">Quản trị</span>
        </span>
      )}
    </div>
  );
}

export function AdminSidebar({
  isCollapsed,
  isMobileOpen,
  onCloseMobile,
  pathname,
}: AdminSidebarProps) {
  return (
    <>
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-30 hidden flex-col border-r bg-card transition-[width] duration-200 lg:flex",
          isCollapsed ? "w-16" : "w-72",
        )}
      >
        <SidebarBrand collapsed={isCollapsed} />
        <div className="min-h-0 flex-1 overflow-y-auto">
          <AdminNavigationContent
            collapsed={isCollapsed}
            onNavigate={() => undefined}
            pathname={pathname}
          />
        </div>
      </aside>

      <Sheet
        onOpenChange={(open) => {
          if (!open) onCloseMobile();
        }}
        open={isMobileOpen}
      >
        <SheetContent
          className="w-72 gap-0 p-0 sm:max-w-72"
          showCloseButton={false}
          side="left"
        >
          <SheetTitle className="sr-only">Điều hướng quản trị</SheetTitle>
          <SheetDescription className="sr-only">
            Chọn khu vực quản trị cần mở.
          </SheetDescription>
          <SidebarBrand />
          <div className="min-h-0 flex-1 overflow-y-auto">
            <AdminNavigationContent
              collapsed={false}
              onNavigate={onCloseMobile}
              pathname={pathname}
            />
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
