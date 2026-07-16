"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { GraduationCap, Lock, User, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { HttpClientError } from "@/src/lib/http-client";
import { useAdminLogin } from "./hooks/use-admin-login";

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
          : "Không thể kết nối đến máy chủ.",
      );
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col items-center justify-center p-4 relative overflow-hidden">
      <Card className="w-full max-w-md bg-white border-zinc-200 text-zinc-900 shadow-lg relative z-10">
        <CardHeader className="space-y-3 flex flex-col items-center text-center">
          <div className="p-3 bg-zinc-100 text-zinc-900 rounded-2xl border border-zinc-200">
            <GraduationCap className="h-10 w-10" />
          </div>
          <div>
            <CardTitle className="text-3xl font-black tracking-tight text-zinc-900">
              Lingo Admin
            </CardTitle>
            <CardDescription className="text-zinc-500 mt-1.5 font-medium">
              English learning content administration
            </CardDescription>
          </div>
        </CardHeader>
        <form onSubmit={handleLogin}>
          <CardContent className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label className="text-zinc-700 font-semibold">Tên đăng nhập</Label>
              <div className="relative">
                <User className="absolute left-3 top-3 h-4 w-4 text-zinc-400" />
                <Input
                  required
                  disabled={loginMutation.isPending}
                  value={formUsername}
                  onChange={(e) => setFormUsername(e.target.value)}
                  placeholder="Nhập tên đăng nhập admin"
                  className="pl-10 bg-white border-zinc-200 text-zinc-900 placeholder:text-zinc-400 focus-visible:ring-zinc-400"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-zinc-700 font-semibold">Mật khẩu</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-zinc-400" />
                <Input
                  required
                  type="password"
                  disabled={loginMutation.isPending}
                  value={formPassword}
                  onChange={(e) => setFormPassword(e.target.value)}
                  placeholder="Nhập mật khẩu"
                  className="pl-10 bg-white border-zinc-200 text-zinc-900 placeholder:text-zinc-400 focus-visible:ring-zinc-400"
                />
              </div>
            </div>
          </CardContent>
          <CardFooter className="pt-2 pb-6">
            <Button
              type="submit"
              disabled={loginMutation.isPending}
              className="w-full bg-zinc-900 hover:bg-zinc-800 text-zinc-55 hover:text-zinc-50 font-semibold h-11 shadow-sm border-0 cursor-pointer"
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
