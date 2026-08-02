"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { GraduationCap, LoaderCircle, LockKeyhole, UserRound } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { FormField } from "@/app/components/forms/FormField";
import { Button } from "@/app/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/app/components/ui/card";
import { Input } from "@/app/components/ui/input";
import { HttpClientError } from "@/app/features/auth/api/http-client";
import {
  loginSchema,
  type LoginFormValues,
} from "@/app/features/auth/components/login.schema";
import { useAdminLogin } from "@/app/features/auth/hooks/use-admin-login";

const appName = process.env.NEXT_PUBLIC_APP_NAME?.trim() || "English Base";

export function LoginView() {
  const router = useRouter();
  const loginMutation = useAdminLogin();
  const form = useForm<LoginFormValues>({
    defaultValues: { password: "", username: "" },
    resolver: zodResolver(loginSchema),
  });

  useEffect(() => {
    const token = localStorage.getItem("admin_token");
    if (token) {
      router.replace("/courses");
    }
  }, [router]);

  const handleLogin = async (values: LoginFormValues) => {
    try {
      const data = await loginMutation.mutateAsync({
        password: values.password,
        username: values.username.trim(),
      });
      localStorage.setItem("admin_token", data.token);
      localStorage.setItem("admin_user", JSON.stringify(data.user));

      toast.success("Đăng nhập thành công.");
      router.replace("/courses");
    } catch (error) {
      toast.error(
        error instanceof HttpClientError && error.status === 401
          ? "Tên đăng nhập hoặc mật khẩu không đúng."
          : "Không thể kết nối đến máy chủ.",
      );
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/30 px-4 py-10">
      <Card className="w-full max-w-md shadow-md">
        <CardHeader className="items-center gap-3 text-center">
          <div className="flex size-12 items-center justify-center rounded-xl border bg-background text-primary shadow-xs">
            <GraduationCap aria-hidden="true" className="size-6" />
          </div>
          <div className="space-y-2">
            <CardTitle className="text-2xl">{appName} Admin</CardTitle>
            <CardDescription className="font-normal">
              Đăng nhập để quản lý nội dung và cấu hình hệ thống.
            </CardDescription>
          </div>
        </CardHeader>

        <form noValidate onSubmit={form.handleSubmit(handleLogin)}>
          <CardContent className="space-y-5">
            <FormField
              error={form.formState.errors.username?.message}
              htmlFor="username"
              label="Tên đăng nhập"
              required
            >
              <div className="relative">
                <UserRound
                  aria-hidden="true"
                  className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                />
                <Input
                  aria-describedby={
                    form.formState.errors.username ? "username-error" : undefined
                  }
                  aria-invalid={Boolean(form.formState.errors.username)}
                  autoComplete="username"
                  className="pl-9"
                  disabled={loginMutation.isPending}
                  id="username"
                  placeholder="Nhập tên đăng nhập"
                  {...form.register("username")}
                />
              </div>
            </FormField>

            <FormField
              error={form.formState.errors.password?.message}
              htmlFor="password"
              label="Mật khẩu"
              required
            >
              <div className="relative">
                <LockKeyhole
                  aria-hidden="true"
                  className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                />
                <Input
                  aria-describedby={
                    form.formState.errors.password ? "password-error" : undefined
                  }
                  aria-invalid={Boolean(form.formState.errors.password)}
                  autoComplete="current-password"
                  className="pl-9"
                  disabled={loginMutation.isPending}
                  id="password"
                  placeholder="Nhập mật khẩu"
                  type="password"
                  {...form.register("password")}
                />
              </div>
            </FormField>
          </CardContent>

          <CardFooter className="pt-6">
            <Button
              className="h-10 w-full"
              disabled={loginMutation.isPending}
              type="submit"
            >
              {loginMutation.isPending ? (
                <>
                  <LoaderCircle aria-hidden="true" className="animate-spin" />
                  Đang đăng nhập
                </>
              ) : (
                "Đăng nhập"
              )}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </main>
  );
}
