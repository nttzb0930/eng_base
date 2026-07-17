"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BookOpen,
  Layers,
  Bookmark,
  HelpCircle,
  CheckSquare,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Menu,
  Activity,
  Users,
  GraduationCap,
  Settings,
} from "lucide-react";
import { toast } from "sonner";

import { AuthGuard } from "@/app/features/auth/components/AuthGuard";
import { cn } from "@/app/utils/cn";
import { Button } from "@/app/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/app/components/ui/dropdown-menu";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [username] = useState(() => {
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
  });

  const handleLogout = () => {
    localStorage.removeItem("admin_token");
    localStorage.removeItem("admin_user");
    toast.success("Successfully logged out");
    router.push("/login");
  };

  const navItems = [
    { href: "/courses", label: "Khóa học (Courses)", icon: BookOpen },
    { href: "/units", label: "Chương học (Units)", icon: Layers },
    { href: "/lessons", label: "Bài học (Lessons)", icon: Bookmark },
    { href: "/challenges", label: "Thử thách (Challenges)", icon: HelpCircle },
    { href: "/challenge-options", label: "Đáp án (Options)", icon: CheckSquare },
    { href: "/users", label: "Người dùng (Users)", icon: Users },
    { href: "/practice-sessions", label: "Lịch sử luyện tập (Practice)", icon: Activity },
    { href: "/settings", label: "Cấu hình (Settings)", icon: Settings },
  ];

  const getPageTitle = () => {
    if (pathname.startsWith("/courses")) return "Quản lý khóa học";
    if (pathname.startsWith("/units")) return "Quản lý chương học";
    if (pathname.startsWith("/lessons")) return "Quản lý bài học";
    if (pathname.startsWith("/challenges")) return "Quản lý thử thách";
    if (pathname.startsWith("/challenge-options")) return "Quản lý đáp án & câu hỏi";
    if (pathname.startsWith("/users")) return "Quản lý người dùng";
    if (pathname.startsWith("/practice-sessions")) return "Lịch sử luyện tập học viên";
    if (pathname.startsWith("/settings")) return "Cấu hình hệ thống";
    return "Lingo Admin panel";
  };

  return (
    <AuthGuard>
      <div className="flex h-screen w-screen bg-zinc-50 overflow-hidden text-zinc-900">
        {/* MOBILE SIDEBAR DRAWERS */}
        {isMobileOpen && (
          <div
            className="fixed inset-0 z-40 bg-zinc-950/40 backdrop-blur-sm md:hidden"
            onClick={() => setIsMobileOpen(false)}
          />
        )}

        <aside
          className={cn(
            "fixed inset-y-0 left-0 z-40 flex flex-col border-r border-zinc-200 bg-white transition-all duration-300 ease-in-out md:static",
            isCollapsed ? "w-0 md:w-20" : "w-64",
            isMobileOpen ? "translate-x-0 w-64" : "-translate-x-full md:translate-x-0"
          )}
        >
          {/* Logo / Header area */}
          <div className="flex h-16 items-center gap-2.5 border-b border-zinc-200 px-6 shrink-0">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-zinc-900 text-zinc-50 border border-zinc-950 shadow-sm shrink-0">
              <GraduationCap className="h-5 w-5" />
            </div>
            <span
              className={cn(
                "font-black tracking-tight text-zinc-900 text-lg transition-opacity duration-300 ease-in-out truncate",
                isCollapsed && "md:opacity-0 md:pointer-events-none"
              )}
            >
              Lingo Admin
            </span>
          </div>

          {/* Navigation Links */}
          <nav className="flex-1 space-y-1.5 p-4 overflow-y-auto min-h-0">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname.startsWith(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsMobileOpen(false)}
                  title={isCollapsed ? item.label : undefined}
                  className={cn(
                    "w-full flex items-center px-4 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 cursor-pointer",
                    isActive
                      ? "bg-zinc-100 text-zinc-900 font-bold"
                      : "text-zinc-650 hover:text-zinc-900 hover:bg-zinc-50"
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span
                    className={cn(
                      "transition-all duration-300 ease-in-out text-nowrap truncate",
                      isCollapsed ? "md:max-w-0 md:opacity-0 md:ml-0 md:pointer-events-none" : "max-w-[180px] opacity-100 ml-3"
                    )}
                  >
                    {item.label}
                  </span>
                </Link>
              );
            })}
          </nav>

          {/* Footer Collapse Button */}
          <div className="mt-auto border-t border-zinc-200 bg-zinc-50/50 p-4 space-y-4 shrink-0">
            <div className="hidden md:block">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="w-full flex items-center justify-start px-2.5 h-8 hover:bg-zinc-100 transition-all duration-200 cursor-pointer active:scale-95 text-zinc-500 hover:text-zinc-900 rounded-lg"
              >
                {isCollapsed ? (
                  <ChevronRight className="h-4 w-4 shrink-0" />
                ) : (
                  <ChevronLeft className="h-4 w-4 shrink-0" />
                )}
                <span
                  className={cn(
                    "text-xs font-semibold transition-all duration-300 ease-in-out text-nowrap truncate",
                    isCollapsed ? "md:max-w-0 md:opacity-0 md:ml-0" : "max-w-[150px] opacity-100 ml-2.5"
                  )}
                >
                  Thu gọn menu
                </span>
              </Button>
            </div>
          </div>
        </aside>

        {/* MAIN VIEW CONTAINER */}
        <div className="flex h-full min-w-0 flex-1 flex-col overflow-hidden">
          <header className="sticky top-0 z-20 flex h-16 w-full shrink-0 items-center justify-between border-b border-zinc-200 bg-white/95 px-4 backdrop-blur-sm md:px-6">
            <div className="flex flex-1 items-center gap-4 min-w-0">
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden shrink-0 text-zinc-650 hover:text-zinc-900"
                onClick={() => setIsMobileOpen(!isMobileOpen)}
              >
                <Menu className="h-5 w-5" />
              </Button>

              <div className="min-w-0">
                <h2 className="text-sm font-bold text-zinc-900 leading-none truncate capitalize">
                  {getPageTitle()}
                </h2>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400 mt-1 block">
                  Lingo Admin panel
                </span>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="flex items-center gap-2 px-3 py-1.5 h-9 border border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-700 hover:text-zinc-900 rounded-lg font-semibold text-xs transition duration-200 shadow-sm cursor-pointer"
                  >
                    <div className="h-5 w-5 rounded-md bg-zinc-900 text-zinc-50 flex items-center justify-center font-bold text-[10px] tracking-tight uppercase shadow-inner">
                      {username.substring(0, 2)}
                    </div>
                    <span>{username}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52 bg-white border border-zinc-200 rounded-xl p-1.5 shadow-lg text-zinc-900">
                  <DropdownMenuLabel className="px-2.5 py-2 text-xs font-semibold text-zinc-400">
                    Tài khoản Admin
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator className="bg-zinc-100 my-1" />
                  <DropdownMenuItem
                    onClick={handleLogout}
                    className="flex items-center gap-2 px-2.5 py-2 text-zinc-650 hover:text-red-600 focus:bg-red-50 focus:text-red-600 rounded-lg text-xs font-bold transition duration-200 cursor-pointer"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                    <span>Đăng xuất</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>

          <main className="min-h-0 flex-1 overflow-y-auto bg-zinc-50/50">
            {children}
          </main>
        </div>
      </div>
    </AuthGuard>
  );
}
