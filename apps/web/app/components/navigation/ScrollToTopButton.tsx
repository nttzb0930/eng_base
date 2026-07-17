"use client";

import { useSyncExternalStore } from "react";
import { ArrowUp } from "lucide-react";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";

import { withLocale } from "@/app/i18n/paths";
import { useCurrentLocale } from "@/app/i18n/use-current-locale";

const subscribeToScroll = (listener: () => void) => {
  window.addEventListener("scroll", listener, { passive: true });

  return () => window.removeEventListener("scroll", listener);
};

const getScrollVisibilitySnapshot = () =>
  typeof window !== "undefined" && window.scrollY > 300;

export const ScrollToTopButton = () => {
  const pathname = usePathname();
  const locale = useCurrentLocale();
  const isVisible = useSyncExternalStore(
    subscribeToScroll,
    getScrollVisibilitySnapshot,
    () => false,
  );

  // List of paths where the scroll to top button is allowed
  const allowedPaths = [
    withLocale("/dashboard", locale),
    withLocale("/learn", locale),
    withLocale("/practice", locale),
    withLocale("/topics", locale),
  ];

  const shouldRender = allowedPaths.includes(pathname);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  if (!shouldRender) return null;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.8, y: 12 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="fixed bottom-6 right-6 z-50 lg:bottom-8 lg:right-8"
        >
          <button
            type="button"
            onClick={scrollToTop}
            className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500 text-white shadow-lift hover:bg-emerald-600 active:scale-95 transition-all duration-150 border-0 focus:outline-none cursor-pointer"
            aria-label="Scroll to top"
            title="Scroll to top"
          >
            <ArrowUp className="h-5 w-5" strokeWidth={2.5} />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
