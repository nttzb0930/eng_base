"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { GraduationCap, Lock, User, Loader2 } from "lucide-react";
import { toast } from "sonner";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/app/components/ui/card";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { useAdminLogin } from "@/app/features/auth/hooks/use-admin-login";
import { HttpClientError } from "@/app/features/auth/api/http-client";

const appName = process.env.NEXT_PUBLIC_APP_NAME?.trim() || "English Base";

export function LoginView() {
  const router = useRouter();
  const [formUsername, setFormUsername] = useState("");
  const [formPassword, setFormPassword] = useState("");
  const loginMutation = useAdminLogin();

  useEffect(() => {
    // If already logged in, redirect to courses
    const token = localStorage.getItem("admin_token");
    if (token) {
      router.push("/courses");
    }
  }, [router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const data = await loginMutation.mutateAsync({
        username: formUsername.trim(),
        password: formPassword,
      });
      localStorage.setItem("admin_token", data.token);
      localStorage.setItem("admin_user", JSON.stringify(data.user));

      toast.success("Successfully logged in!");
      router.push("/courses");
    } catch (error) {
      toast.error(
        error instanceof HttpClientError && error.status === 401
          ? "Tên đăng nhập hoặc mật khẩu không đúng."
          : "Không thể kết nối đến máy chủ."
      );
    }
  };

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-zinc-50 p-4">
      <Card className="relative z-10 w-full max-w-md border-zinc-200 bg-white text-zinc-900 shadow-lg">
        <CardHeader className="flex flex-col items-center space-y-3 text-center">
          <div className="rounded-2xl border border-zinc-200 bg-zinc-100 p-3 text-zinc-900">
            <GraduationCap className="h-10 w-10" />
          </div>
          <div>
            <CardTitle className="text-3xl font-black tracking-tight text-zinc-900">
              {appName} Admin
            </CardTitle>
            <CardDescription className="mt-1.5 font-medium text-zinc-500">
              English learning content administration
            </CardDescription>
          </div>
        </CardHeader>
        <form onSubmit={handleLogin}>
          <CardContent className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label className="font-semibold text-zinc-700">
                Tên đăng nhập
              </Label>
              <div className="relative">
                <User className="absolute left-3 top-3 h-4 w-4 text-zinc-400" />
                <Input
                  required
                  disabled={loginMutation.isPending}
                  value={formUsername}
                  onChange={(e) => setFormUsername(e.target.value)}
                  placeholder="Nhập tên đăng nhập admin"
                  className="border-zinc-200 bg-white pl-10 text-zinc-900 placeholder:text-zinc-400 focus-visible:ring-zinc-400"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="font-semibold text-zinc-700">Mật khẩu</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-zinc-400" />
                <Input
                  required
                  type="password"
                  disabled={loginMutation.isPending}
                  value={formPassword}
                  onChange={(e) => setFormPassword(e.target.value)}
                  placeholder="Nhập mật khẩu"
                  className="border-zinc-200 bg-white pl-10 text-zinc-900 placeholder:text-zinc-400 focus-visible:ring-zinc-400"
                />
              </div>
            </div>
          </CardContent>
          <CardFooter className="pb-6 pt-2">
            <Button
              type="submit"
              disabled={loginMutation.isPending}
              className="text-zinc-55 h-11 w-full cursor-pointer border-0 bg-zinc-900 font-semibold shadow-sm hover:bg-zinc-800 hover:text-zinc-50"
            >
              {loginMutation.isPending ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" /> Đang đăng nhập...
                </span>
              ) : (
                "Đăng nhập hệ thống"
              )}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
