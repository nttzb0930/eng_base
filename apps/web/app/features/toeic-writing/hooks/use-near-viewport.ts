"use client";

import { useCallback, useEffect, useState } from "react";

export function useNearViewport<T extends Element = HTMLElement>() {
  const [element, setElement] = useState<T | null>(null);
  const [isNearViewport, setIsNearViewport] = useState(false);
  const ref = useCallback((node: T | null) => setElement(node), []);

  useEffect(() => {
    if (isNearViewport || !element) return;
    if (typeof IntersectionObserver === "undefined") {
      let disposed = false;
      queueMicrotask(() => {
        if (!disposed) setIsNearViewport(true);
      });
      return () => {
        disposed = true;
      };
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        setIsNearViewport(true);
        observer.disconnect();
      },
      { rootMargin: "240px" }
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [element, isNearViewport]);

  return { ref, isNearViewport };
}
