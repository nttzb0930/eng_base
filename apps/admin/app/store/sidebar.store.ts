"use client";

import { useCallback, useEffect, useState } from "react";

const COLLAPSED_STORAGE_KEY = "admin-sidebar-collapsed";

export function useSidebarState() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isPreferenceReady, setIsPreferenceReady] = useState(false);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      try {
        setIsCollapsed(localStorage.getItem(COLLAPSED_STORAGE_KEY) === "true");
      } catch {
        setIsCollapsed(false);
      } finally {
        setIsPreferenceReady(true);
      }
    });

    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (!isPreferenceReady) return;
    try {
      localStorage.setItem(COLLAPSED_STORAGE_KEY, String(isCollapsed));
    } catch {
      // Presentation preference persistence is best-effort only.
    }
  }, [isCollapsed, isPreferenceReady]);

  const toggleCollapsed = useCallback(() => {
    setIsCollapsed((current) => !current);
  }, []);
  const toggleMobile = useCallback(() => {
    setIsMobileOpen((current) => !current);
  }, []);
  const closeMobile = useCallback(() => {
    setIsMobileOpen(false);
  }, []);

  return {
    isCollapsed,
    isMobileOpen,
    toggleCollapsed,
    toggleMobile,
    closeMobile,
  };
}
