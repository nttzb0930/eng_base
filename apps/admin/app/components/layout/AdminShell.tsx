"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { toast } from "sonner";

import { AuthGuard } from "@/app/features/auth/components/AuthGuard";
import { useSidebarState } from "@/app/store/sidebar.store";

import { AdminNavbar } from "./AdminNavbar";
import { getAdminPageTitle } from "./admin-navigation";
import { AdminSidebar } from "./AdminSidebar";

function readAdminUsername() {
  if (typeof window === "undefined") return "Admin";
  const savedUser = localStorage.getItem("admin_user");
  if (!savedUser) return "Admin";

  try {
    const user = JSON.parse(savedUser) as { username?: unknown };
    return typeof user.username === "string" && user.username ? user.username : "Admin";
  } catch {
    return "Admin";
  }
}

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [username] = useState(readAdminUsername);
  const {
    isCollapsed,
    isMobileOpen,
    toggleCollapsed,
    toggleMobile,
    closeMobile,
  } = useSidebarState();

  const handleLogout = () => {
    localStorage.removeItem("admin_token");
    localStorage.removeItem("admin_user");
    toast.success("Successfully logged out");
    router.push("/login");
  };

  return (
    <AuthGuard>
      <div className="flex h-screen w-screen overflow-hidden bg-zinc-50 text-zinc-900">
        {isMobileOpen && (
          <div
            className="fixed inset-0 z-40 bg-zinc-950/40 backdrop-blur-sm md:hidden"
            onClick={closeMobile}
          />
        )}

        <AdminSidebar
          pathname={pathname}
          isCollapsed={isCollapsed}
          isMobileOpen={isMobileOpen}
          onCloseMobile={closeMobile}
          onToggleCollapsed={toggleCollapsed}
        />

        <div className="flex h-full min-w-0 flex-1 flex-col overflow-hidden">
          <AdminNavbar
            title={getAdminPageTitle(pathname)}
            username={username}
            onLogout={handleLogout}
            onToggleMobile={toggleMobile}
          />
          <main className="min-h-0 flex-1 overflow-y-auto bg-zinc-50/50">{children}</main>
        </div>
      </div>
    </AuthGuard>
  );
}
