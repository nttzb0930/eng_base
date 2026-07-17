"use client";

import { useState, useEffect, useRef } from "react";
import { LogOut, Home, BookOpen, Target, Trophy, Bookmark, Heart, Layers } from "lucide-react";
import Image from "next/image";
import { LocalizedLink as Link } from "@/app/components/navigation/LocalizedLink";
import { useTranslations } from "next-intl";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";

import { withLocale } from "@/app/i18n/paths";
import { useCurrentLocale } from "@/app/i18n/use-current-locale";
import { cn } from "@/app/utils/cn";
import { Avatar, AvatarFallback } from "@/app/components/ui/avatar";
import { useAuth } from "@/src/providers";

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
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const navItems = [
    { label: t("dashboard"), href: "/dashboard", icon: Home },
    { label: t("learn"), href: "/learn", icon: BookOpen },
    { label: t("practice"), href: "/practice", icon: Target },
    { label: t("topics"), href: "/topics", icon: Bookmark },
    { label: t("savedWords"), href: "/saved-words", icon: Heart },
    { label: t("flashcards"), href: "/flashcards", icon: Layers },
    { label: t("leaderboard"), href: "/leaderboard", icon: Trophy },
  ];

  return (
    <header
      className={cn(
        "sticky top-0 z-50 w-full h-[68px] border-b border-slate-100 bg-white/90 backdrop-blur-md transition-all duration-200",
        className
      )}
    >
      <div className="mx-auto w-full max-w-container px-4 sm:px-6 lg:px-8 h-full flex items-center justify-between gap-6">
        {/* Left Side: Brand Logo */}
        <Link href={withLocale("/dashboard", locale)} className="flex items-center gap-3 select-none flex-shrink-0">
          <Image
            src="/mascot.svg"
            alt="VoCaBu Logo"
            height={38}
            width={38}
            className="h-[38px] w-[38px]"
          />
          <div>
            <h1 className="text-base font-black tracking-tight text-slate-800 leading-none">VoCaBu</h1>
            <p className="text-[10px] font-semibold text-slate-400 mt-0.5 leading-none">English, every day</p>
          </div>
        </Link>

        {/* Center Side: Pill segment topnav */}
        <nav className="flex items-center gap-0.5 p-1 bg-slate-100/80 border border-slate-200/40 rounded-2xl max-w-4xl" aria-label="Primary">
          {navItems.map((item) => {
            const Icon = item.icon;
            const localizedHref = withLocale(item.href, locale);
            const isActive = pathname === localizedHref;

            return (
              <Link
                key={item.href}
                href={localizedHref}
                className={cn(
                  "relative flex-shrink-0 flex items-center justify-center gap-1.5 py-1.5 px-3.5 rounded-xl text-[13px] font-semibold transition-all duration-200 whitespace-nowrap",
                  isActive ? "text-sky-600 font-extrabold" : "text-slate-500 hover:text-slate-900"
                )}
              >
                {isActive && (
                  <motion.div
                    layoutId="activeHeaderIndicator"
                    className="absolute inset-0 rounded-xl bg-white shadow-sm border border-slate-200/30"
                    transition={{
                      type: "spring",
                      stiffness: 220,
                      damping: 24,
                    }}
                  />
                )}
                <span className="relative z-10 flex items-center gap-1.5">
                  <Icon className={cn("h-4 w-4 flex-shrink-0", isActive ? "text-sky-500" : "opacity-75")} strokeWidth={isActive ? 2.5 : 2} />
                  <span className="hidden lg:inline">{item.label}</span>
                </span>
              </Link>
            );
          })}
        </nav>

        {/* Right Side: User profile & actions */}
        <div className="flex items-center gap-4 flex-shrink-0">
          {status === "loading" ? (
            <div className="h-9 w-9 bg-slate-100 rounded-full animate-pulse border border-slate-200/40" />
          ) : (
            <div className="relative" ref={dropdownRef}>
              {/* Avatar trigger */}
              <button
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="flex items-center gap-x-2 focus:outline-none select-none"
                aria-label="User menu"
                aria-haspopup="true"
                aria-expanded={isDropdownOpen}
              >
                <Avatar className="h-9 w-9 border border-sky-100 bg-sky-50/50 hover:scale-105 active:scale-95 transition-all duration-150 shadow-sm cursor-pointer">
                  <AvatarFallback className="bg-sky-50 text-sky-600 text-sm font-black">
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
                    className="absolute right-0 mt-2.5 w-60 bg-white border border-slate-100 rounded-2xl p-2 shadow-[0_16px_40px_rgba(15,23,42,0.12)] z-50 focus:outline-none"
                    role="menu"
                  >
                    {/* User Info Header */}
                    <div className="px-3.5 py-3 border-b border-slate-50 mb-1.5">
                      <p className="text-xs font-black text-slate-800 truncate" title={displayName}>
                        {displayName}
                      </p>
                      <p className="text-[10px] font-semibold text-slate-400 mt-0.5 uppercase tracking-wider">
                        {t("learner")}
                      </p>
                    </div>

                    {/* Menu links */}
                    <Link
                      href={withLocale("/saved-words", locale)}
                      onClick={() => setIsDropdownOpen(false)}
                      className={cn(
                        "flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors",
                        pathname === withLocale("/saved-words", locale) && "bg-slate-50 text-slate-900"
                      )}
                    >
                      <Heart className="h-4 w-4 text-slate-400" />
                      <span>{t("savedWords")}</span>
                    </Link>

                    <Link
                      href={withLocale("/flashcards", locale)}
                      onClick={() => setIsDropdownOpen(false)}
                      className={cn(
                        "flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors",
                        pathname === withLocale("/flashcards", locale) && "bg-slate-50 text-slate-900"
                      )}
                    >
                      <Layers className="h-4 w-4 text-slate-400" />
                      <span>{t("flashcards")}</span>
                    </Link>

                    <div className="h-px bg-slate-50 my-1.5" />

                    {/* Sign out button */}
                    <button
                      onClick={() => {
                        setIsDropdownOpen(false);
                        void logout().finally(() => window.location.replace("/"));
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-rose-500 hover:bg-rose-50/50 hover:text-rose-600 transition-colors text-left"
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
