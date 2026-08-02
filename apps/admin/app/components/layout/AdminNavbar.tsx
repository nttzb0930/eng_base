"use client";

import { LogOut, Menu, PanelLeftClose, PanelLeftOpen } from "lucide-react";

import { ThemeMenu } from "@/app/components/theme/ThemeMenu";
import { Button } from "@/app/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/app/components/ui/dropdown-menu";

type AdminNavbarProps = {
  isCollapsed: boolean;
  onLogout(): void;
  onToggleDesktop(): void;
  onToggleMobile(): void;
  title: string;
  username: string;
};

export function AdminNavbar({
  isCollapsed,
  onLogout,
  onToggleDesktop,
  onToggleMobile,
  title,
  username,
}: AdminNavbarProps) {
  const initials = username.trim().slice(0, 2).toUpperCase() || "AD";

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b bg-background/90 px-4 backdrop-blur lg:px-6">
      <Button
        aria-label="Mở điều hướng"
        className="lg:hidden"
        onClick={onToggleMobile}
        size="icon"
        variant="ghost"
      >
        <Menu />
      </Button>
      <Button
        aria-label={isCollapsed ? "Mở rộng điều hướng" : "Thu gọn điều hướng"}
        className="hidden lg:inline-flex"
        onClick={onToggleDesktop}
        size="icon"
        variant="ghost"
      >
        {isCollapsed ? <PanelLeftOpen /> : <PanelLeftClose />}
      </Button>

      <h1 className="min-w-0 flex-1 truncate text-sm font-medium">{title}</h1>

      <ThemeMenu />
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button className="gap-2 px-2" variant="ghost">
            <span className="flex size-7 items-center justify-center rounded-md bg-primary text-xs font-medium text-primary-foreground">
              {initials}
            </span>
            <span className="hidden max-w-36 truncate text-sm font-medium sm:block">
              {username}
            </span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          <DropdownMenuLabel>
            <span className="block text-xs font-normal text-muted-foreground">
              Tài khoản quản trị
            </span>
            <span className="block truncate font-medium">{username}</span>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onSelect={onLogout}>
            <LogOut />
            Đăng xuất
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
