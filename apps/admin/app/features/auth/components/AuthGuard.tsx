"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";

import { LoadingState } from "@/app/components/feedback/LoadingState";

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
      <main className="min-h-screen bg-background px-6 py-10">
        <div className="mx-auto w-full max-w-6xl">
          <LoadingState label="Đang xác thực phiên quản trị" rows={3} />
        </div>
      </main>
    );
  }

  return <>{children}</>;
}
