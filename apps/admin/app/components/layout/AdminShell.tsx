"use client";

import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { AuthGuard } from "@/app/features/auth/components/AuthGuard";
import { useSidebarState } from "@/app/store/sidebar.store";
import { cn } from "@/app/utils/cn";

import { AdminNavbar } from "./AdminNavbar";
import { getAdminPageTitle } from "./admin-navigation";
import { AdminSidebar } from "./AdminSidebar";

function readAdminUsername() {
  if (typeof window === "undefined") return "Admin";
  const savedUser = localStorage.getItem("admin_user");
  if (!savedUser) return "Admin";

  try {
    const user = JSON.parse(savedUser) as { username?: unknown };
    return typeof user.username === "string" && user.username
      ? user.username
      : "Admin";
  } catch {
    return "Admin";
  }
}

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [username] = useState(readAdminUsername);
  const {
    closeMobile,
    isCollapsed,
    isMobileOpen,
    toggleCollapsed,
    toggleMobile,
  } = useSidebarState();

  const handleLogout = () => {
    localStorage.removeItem("admin_token");
    localStorage.removeItem("admin_user");
    toast.success("Đã đăng xuất");
    router.push("/login");
  };

  return (
    <AuthGuard>
      <div className="min-h-dvh bg-background text-foreground">
        <AdminSidebar
          isCollapsed={isCollapsed}
          isMobileOpen={isMobileOpen}
          onCloseMobile={closeMobile}
          pathname={pathname}
        />
        <div
          className={cn(
            "min-h-dvh transition-[padding] duration-200",
            isCollapsed ? "lg:pl-16" : "lg:pl-72",
          )}
        >
          <AdminNavbar
            isCollapsed={isCollapsed}
            onLogout={handleLogout}
            onToggleDesktop={toggleCollapsed}
            onToggleMobile={toggleMobile}
            title={getAdminPageTitle(pathname)}
            username={username}
          />
          <main className="mx-auto w-full max-w-[88rem] px-4 py-6 lg:px-8 lg:py-8">
            {children}
          </main>
        </div>
      </div>
    </AuthGuard>
  );
}
