"use client";

import { useState, useEffect, useRef } from "react";
import {
  LogOut,
  Home,
  BookOpen,
  Trophy,
  Heart,
  Layers,
} from "lucide-react";
import Image from "next/image";
import { LocalizedLink as Link } from "@/app/components/navigation/LocalizedLink";
import { useTranslations } from "next-intl";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";

import { withLocale } from "@/app/i18n/paths";
import { useCurrentLocale } from "@/app/i18n/use-current-locale";
import { cn } from "@/app/utils/cn";
import { Avatar, AvatarFallback } from "@/app/components/ui/avatar";
import { useAuth } from "@/app/features/auth/hooks/use-auth";

const appName = process.env.NEXT_PUBLIC_APP_NAME?.trim() || "English Base";

type HeaderProps = {
  className?: string;
};

export const Header = ({ className }: HeaderProps) => {
  const t = useTranslations("navigation");
  const { logout, user, status } = useAuth();
  const pathname = usePathname();
  const locale = useCurrentLocale();

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const displayName = user?.fullName || user?.username || t("learner");

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const navItems = [
    {
      label: t("dashboard"),
      href: "/dashboard",
      icon: Home,
      activePrefixes: ["/dashboard"],
    },
    {
      label: t("learn"),
      href: "/learn",
      icon: BookOpen,
      activePrefixes: ["/learn", "/practice", "/reading"],
    },
    {
      label: t("savedWords"),
      href: "/saved-words",
      icon: Heart,
      activePrefixes: ["/saved-words"],
    },
    {
      label: t("flashcards"),
      href: "/flashcards",
      icon: Layers,
      activePrefixes: ["/flashcards"],
    },
    {
      label: t("leaderboard"),
      href: "/leaderboard",
      icon: Trophy,
      activePrefixes: ["/leaderboard"],
    },
  ];

  return (
    <header
      className={cn(
        "sticky top-0 z-50 h-[68px] w-full border-b border-slate-100 bg-white/90 backdrop-blur-md transition-all duration-200",
        className
      )}
    >
      <div className="max-w-container mx-auto flex h-full w-full items-center justify-between gap-6 px-4 sm:px-6 lg:px-8">
        {/* Left Side: Brand Logo */}
        <Link
          href={withLocale("/dashboard", locale)}
          className="flex flex-shrink-0 select-none items-center gap-3"
        >
          <Image
            src="/mascot.svg"
            alt={`${appName} logo`}
            height={38}
            width={38}
            className="h-[38px] w-[38px]"
          />
          <div>
            <h1 className="text-base font-semibold leading-none tracking-tight text-slate-800">
              {appName}
            </h1>
            <p className="mt-0.5 text-[10px] font-normal leading-none text-slate-400">
              English, every day
            </p>
          </div>
        </Link>

        {/* Center Side: Pill segment topnav */}
        <nav
          className="flex max-w-4xl items-center gap-0.5 rounded-2xl border border-slate-200/40 bg-slate-100/80 p-1"
          aria-label="Primary"
        >
          {navItems.map((item) => {
            const Icon = item.icon;
            const localizedHref = withLocale(item.href, locale);
            const isActive = item.activePrefixes.some((prefix) => {
              const localizedPrefix = withLocale(prefix, locale);
              return (
                pathname === localizedPrefix ||
                pathname.startsWith(localizedPrefix + "/")
              );
            });

            return (
              <Link
                key={item.href}
                href={localizedHref}
                className={cn(
                  "relative flex flex-shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-xl px-3.5 py-1.5 text-[13px] font-medium transition-all duration-200",
                  isActive
                    ? "text-sky-600"
                    : "text-slate-500 hover:text-slate-900"
                )}
              >
                {isActive && (
                  <motion.div
                    layoutId="activeHeaderIndicator"
                    className="absolute inset-0 rounded-xl border border-slate-200/30 bg-white shadow-sm"
                    transition={{
                      type: "spring",
                      stiffness: 220,
                      damping: 24,
                    }}
                  />
                )}
                <span className="relative z-10 flex items-center gap-1.5">
                  <Icon
                    className={cn(
                      "h-4 w-4 flex-shrink-0",
                      isActive ? "text-sky-500" : "opacity-75"
                    )}
                    strokeWidth={isActive ? 2.5 : 2}
                  />
                  <span className="hidden lg:inline">{item.label}</span>
                </span>
              </Link>
            );
          })}
        </nav>

        {/* Right Side: User profile & actions */}
        <div className="flex flex-shrink-0 items-center gap-4">
          {status === "loading" ? (
            <div className="h-9 w-9 animate-pulse rounded-full border border-slate-200/40 bg-slate-100" />
          ) : (
            <div className="relative" ref={dropdownRef}>
              {/* Avatar trigger */}
              <button
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="flex select-none items-center gap-x-2 focus:outline-none"
                aria-label="User menu"
                aria-haspopup="true"
                aria-expanded={isDropdownOpen}
              >
                <Avatar className="h-9 w-9 cursor-pointer border border-sky-100 bg-sky-50/50 shadow-sm transition-all duration-150 hover:scale-105 active:scale-95">
                  <AvatarFallback className="bg-sky-50 text-sm font-black text-sky-600">
                    {displayName.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </button>

              {/* Dropdown Menu */}
              <AnimatePresence>
                {isDropdownOpen && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.96, y: 6 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.96, y: 6 }}
                    transition={{ duration: 0.15, ease: "easeOut" }}
                    className="absolute right-0 z-50 mt-2.5 w-60 rounded-2xl border border-slate-100 bg-white p-2 shadow-[0_16px_40px_rgba(15,23,42,0.12)] focus:outline-none"
                    role="menu"
                  >
                    {/* User Info Header */}
                    <div className="mb-1.5 border-b border-slate-50 px-3.5 py-3">
                      <p
                        className="truncate text-xs font-black text-slate-800"
                        title={displayName}
                      >
                        {displayName}
                      </p>
                      <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                        {t("learner")}
                      </p>
                    </div>

                    {/* Menu links */}
                    <Link
                      href={withLocale("/saved-words", locale)}
                      onClick={() => setIsDropdownOpen(false)}
                      className={cn(
                        "flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900",
                        pathname === withLocale("/saved-words", locale) &&
                          "bg-slate-50 text-slate-900"
                      )}
                    >
                      <Heart className="h-4 w-4 text-slate-400" />
                      <span>{t("savedWords")}</span>
                    </Link>

                    <Link
                      href={withLocale("/flashcards", locale)}
                      onClick={() => setIsDropdownOpen(false)}
                      className={cn(
                        "flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900",
                        pathname === withLocale("/flashcards", locale) &&
                          "bg-slate-50 text-slate-900"
                      )}
                    >
                      <Layers className="h-4 w-4 text-slate-400" />
                      <span>{t("flashcards")}</span>
                    </Link>

                    <div className="my-1.5 h-px bg-slate-50" />

                    {/* Sign out button */}
                    <button
                      onClick={() => {
                        setIsDropdownOpen(false);
                        void logout().finally(() =>
                          window.location.replace("/")
                        );
                      }}
                      className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-xs font-semibold text-rose-500 transition-colors hover:bg-rose-50/50 hover:text-rose-600"
                    >
                      <LogOut className="h-4 w-4 text-rose-400" />
                      <span>{t("logout")}</span>
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
