"use client";

import { LogOut, Menu } from "lucide-react";

import { Button } from "@/app/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/app/components/ui/dropdown-menu";

const appName = process.env.NEXT_PUBLIC_APP_NAME?.trim() || "English Base";

type AdminNavbarProps = {
  title: string;
  username: string;
  onLogout(): void;
  onToggleMobile(): void;
};

export function AdminNavbar({
  title,
  username,
  onLogout,
  onToggleMobile,
}: AdminNavbarProps) {
  return (
    <header className="sticky top-0 z-20 flex h-16 w-full shrink-0 items-center justify-between border-b border-zinc-200 bg-white/95 px-4 backdrop-blur-sm md:px-6">
      <div className="flex min-w-0 flex-1 items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          className="text-zinc-650 shrink-0 hover:text-zinc-900 md:hidden"
          onClick={onToggleMobile}
        >
          <Menu className="h-5 w-5" />
        </Button>

        <div className="min-w-0">
          <h2 className="truncate text-sm font-bold capitalize leading-none text-zinc-900">
            {title}
          </h2>
          <span className="mt-1 block text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
            {appName} Admin panel
          </span>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="flex h-9 cursor-pointer items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 shadow-sm transition duration-200 hover:bg-zinc-50 hover:text-zinc-900"
            >
              <div className="flex h-5 w-5 items-center justify-center rounded-md bg-zinc-900 text-[10px] font-bold uppercase tracking-tight text-zinc-50 shadow-inner">
                {username.substring(0, 2)}
              </div>
              <span>{username}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="w-52 rounded-xl border border-zinc-200 bg-white p-1.5 text-zinc-900 shadow-lg"
          >
            <DropdownMenuLabel className="px-2.5 py-2 text-xs font-semibold text-zinc-400">
              Tài khoản Admin
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="my-1 bg-zinc-100" />
            <DropdownMenuItem
              onClick={onLogout}
              className="text-zinc-650 flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-bold transition duration-200 hover:text-red-600 focus:bg-red-50 focus:text-red-600"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span>Đăng xuất</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
