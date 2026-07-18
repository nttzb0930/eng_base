"use client";

import { useCallback, useState } from "react";

export function useSidebarState() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

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
