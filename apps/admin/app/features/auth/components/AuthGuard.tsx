"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    const checkAuth = () => {
      const token = localStorage.getItem("admin_token");
      if (!token) {
        setAuthorized(false);
        router.push("/login");
      } else {
        setAuthorized(true);
      }
    };

    checkAuth();

    const handleAuthReset = () => {
      setAuthorized(false);
      router.push("/login");
    };

    window.addEventListener("auth-reset", handleAuthReset);
    return () => {
      window.removeEventListener("auth-reset", handleAuthReset);
    };
  }, [router, pathname]);

  if (!authorized) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-zinc-50">
        <div className="flex flex-col items-center gap-2">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-zinc-950 border-t-transparent" />
          <span className="text-xs font-semibold text-zinc-500">Checking credentials...</span>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
