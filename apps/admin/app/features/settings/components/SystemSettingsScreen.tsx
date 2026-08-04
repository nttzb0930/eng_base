"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import type { SystemSettings, UpdateSystemSettingsPayload } from "@repo/shared";
import { BookOpen, Info, RefreshCcw, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import {
  Controller,
  type FieldError,
  type UseFormRegister,
  useForm,
} from "react-hook-form";
import { toast } from "sonner";

import { ErrorState } from "@/app/components/feedback/ErrorState";
import { LoadingState } from "@/app/components/feedback/LoadingState";
import { FormActions } from "@/app/components/forms/FormActions";
import { FormField } from "@/app/components/forms/FormField";
import { PageHeader } from "@/app/components/layout/PageHeader";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/app/components/ui/card";
import { Input } from "@/app/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/components/ui/select";
import { Switch } from "@/app/components/ui/switch";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/app/components/ui/tabs";
import {
  useSystemSettings,
  useUpdateSystemSettings,
} from "@/app/features/settings/hooks/use-setting";

import {
  systemSettingsSchema,
  type SystemSettingsFormValues,
} from "./system-settings.schema";

const defaultSettings: SystemSettingsFormValues = {
  maxHearts: 5,
  practiceWordsPerLesson: 15,
  weakWordsLimit: 20,
  dailyReviewRelaxedLimit: 5,
  dailyReviewStandardLimit: 15,
  dailyReviewAcceleratedLimit: 30,
  dailyReviewIntensiveLimit: 50,
  registrationEnabled: true,
};

type SettingsSection = "learning" | "review" | "access";
type NumberSettingName = Exclude<
  keyof SystemSettingsFormValues,
  "registrationEnabled"
>;

const sections: Array<{
  description: string;
  icon: typeof BookOpen;
  label: string;
  value: SettingsSection;
}> = [
  {
    value: "learning",
    label: "Học tập",
    description: "Bài học và luyện tập",
    icon: BookOpen,
  },
  {
    value: "review",
    label: "Ôn tập",
    description: "Khối lượng theo cường độ",
    icon: RefreshCcw,
  },
  {
    value: "access",
    label: "Truy cập",
    description: "Đăng ký tài khoản",
    icon: ShieldCheck,
  },
];

type NumberSettingFieldProps = {
  description: string;
  error?: FieldError;
  label: string;
  maximum: number;
  minimum: number;
  name: NumberSettingName;
  register: UseFormRegister<SystemSettingsFormValues>;
  unit: string;
};

function NumberSettingField({
  description,
  error,
  label,
  maximum,
  minimum,
  name,
  register,
  unit,
}: NumberSettingFieldProps) {
  const describedBy = [
    `${name}-description`,
    error ? `${name}-error` : undefined,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <FormField
      description={description}
      error={error?.message}
      htmlFor={name}
      label={label}
      required
    >
      <div className="flex max-w-xs items-center gap-3">
        <Input
          {...register(name, { valueAsNumber: true })}
          aria-describedby={describedBy}
          aria-invalid={Boolean(error)}
          className="max-w-32 tabular-nums"
          id={name}
          inputMode="numeric"
          max={maximum}
          min={minimum}
          type="number"
        />
        <span className="text-sm font-normal text-muted-foreground">{unit}</span>
      </div>
    </FormField>
  );
}

export function SystemSettingsScreen() {
  const [activeSection, setActiveSection] =
    useState<SettingsSection>("learning");
  const settingsQuery = useSystemSettings();
  const updateSettings = useUpdateSystemSettings();
  const {
    control,
    formState: { dirtyFields, errors, isDirty },
    handleSubmit,
    register,
    reset,
  } = useForm<SystemSettingsFormValues>({
    defaultValues: defaultSettings,
    resolver: zodResolver(systemSettingsSchema),
  });

  useEffect(() => {
    if (settingsQuery.data) {
      reset(settingsQuery.data);
    }
  }, [reset, settingsQuery.data]);

  const resetForm = () => {
    reset(settingsQuery.data ?? defaultSettings);
  };

  const submitSettings = async (values: SystemSettingsFormValues) => {
    const changedFields = Object.keys(dirtyFields) as Array<keyof SystemSettings>;
    if (changedFields.length === 0) return;

    const payload: UpdateSystemSettingsPayload = {};
    for (const field of changedFields) {
      Object.assign(payload, { [field]: values[field] });
    }

    try {
      const updatedSettings = await updateSettings.mutateAsync(payload);
      reset(updatedSettings);
      toast.success("Đã lưu cấu hình hệ thống.");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Không thể cập nhật cấu hình hệ thống.",
      );
    }
  };

  if (settingsQuery.isLoading) {
    return <LoadingState label="Đang tải cấu hình hệ thống" rows={3} />;
  }

  if (settingsQuery.isError) {
    return (
      <ErrorState
        description="Không thể tải cấu hình hệ thống. Vui lòng kiểm tra kết nối và thử lại."
        onRetry={() => void settingsQuery.refetch()}
        title="Không tải được cấu hình"
      />
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        description="Điều chỉnh quy mô bài học, nhịp ôn tập và quyền đăng ký cho toàn hệ thống."
        eyebrow="Hệ thống"
        title="Cấu hình"
      />

      <div className="flex gap-3 rounded-lg border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
        <Info aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
        <p className="font-normal leading-5">
          Thay đổi được áp dụng cho các phiên học hoặc yêu cầu bắt đầu sau khi
          lưu. Phiên đang diễn ra không bị thay đổi giữa chừng.
        </p>
      </div>

      <form onSubmit={handleSubmit(submitSettings)}>
        <div className="mb-4 md:hidden">
          <Select
            onValueChange={(value) => setActiveSection(value as SettingsSection)}
            value={activeSection}
          >
            <SelectTrigger aria-label="Chọn nhóm cấu hình" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {sections.map((section) => (
                <SelectItem key={section.value} value={section.value}>
                  {section.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Tabs
          className="grid items-start gap-6 md:grid-cols-[13rem_minmax(0,1fr)]"
          onValueChange={(value) => setActiveSection(value as SettingsSection)}
          orientation="vertical"
          value={activeSection}
        >
          <TabsList className="hidden h-auto w-full items-stretch bg-muted/60 p-1 md:flex">
            {sections.map((section) => {
              const Icon = section.icon;
              return (
                <TabsTrigger
                  className="h-auto items-start gap-3 px-3 py-3 text-left"
                  key={section.value}
                  value={section.value}
                >
                  <Icon aria-hidden="true" className="mt-0.5 size-4" />
                  <span className="min-w-0">
                    <span className="block font-medium">{section.label}</span>
                    <span className="mt-0.5 block truncate text-xs font-normal text-muted-foreground">
                      {section.description}
                    </span>
                  </span>
                </TabsTrigger>
              );
            })}
          </TabsList>

          <div className="min-w-0">
            <TabsContent className="mt-0" value="learning">
              <Card>
                <CardHeader>
                  <CardTitle>Học tập và luyện tập</CardTitle>
                  <CardDescription>
                    Các giới hạn dùng khi tạo phiên học và chọn từ cần luyện.
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-6 sm:grid-cols-2">
                  <NumberSettingField
                    description="Số lần trả lời sai tối đa trước khi kết thúc phiên học."
                    error={errors.maxHearts}
                    label="Số lượt sai tối đa"
                    maximum={99}
                    minimum={1}
                    name="maxHearts"
                    register={register}
                    unit="lượt"
                  />
                  <NumberSettingField
                    description="Số từ được chọn khi bắt đầu một bài luyện tập mới."
                    error={errors.practiceWordsPerLesson}
                    label="Số từ mỗi bài luyện"
                    maximum={50}
                    minimum={5}
                    name="practiceWordsPerLesson"
                    register={register}
                    unit="từ"
                  />
                  <NumberSettingField
                    description="Số từ yếu tối đa được ưu tiên trong một lần chọn."
                    error={errors.weakWordsLimit}
                    label="Giới hạn từ yếu"
                    maximum={100}
                    minimum={5}
                    name="weakWordsLimit"
                    register={register}
                    unit="từ"
                  />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent className="mt-0" value="review">
              <Card>
                <CardHeader>
                  <CardTitle>Khối lượng ôn tập hằng ngày</CardTitle>
                  <CardDescription>
                    Số từ tối đa theo từng cường độ ôn tập mà học viên lựa chọn.
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-6 sm:grid-cols-2">
                  <NumberSettingField
                    description="Nhịp nhẹ, phù hợp để duy trì thói quen mỗi ngày."
                    error={errors.dailyReviewRelaxedLimit}
                    label="Thư giãn"
                    maximum={50}
                    minimum={1}
                    name="dailyReviewRelaxedLimit"
                    register={register}
                    unit="từ/ngày"
                  />
                  <NumberSettingField
                    description="Khối lượng cân bằng cho tiến độ học thông thường."
                    error={errors.dailyReviewStandardLimit}
                    label="Tiêu chuẩn"
                    maximum={100}
                    minimum={1}
                    name="dailyReviewStandardLimit"
                    register={register}
                    unit="từ/ngày"
                  />
                  <NumberSettingField
                    description="Nhịp nhanh dành cho giai đoạn cần tăng tốc."
                    error={errors.dailyReviewAcceleratedLimit}
                    label="Tăng tốc"
                    maximum={150}
                    minimum={1}
                    name="dailyReviewAcceleratedLimit"
                    register={register}
                    unit="từ/ngày"
                  />
                  <NumberSettingField
                    description="Khối lượng cao nhất cho lịch ôn tập chuyên sâu."
                    error={errors.dailyReviewIntensiveLimit}
                    label="Chuyên sâu"
                    maximum={200}
                    minimum={1}
                    name="dailyReviewIntensiveLimit"
                    register={register}
                    unit="từ/ngày"
                  />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent className="mt-0" value="access">
              <Card>
                <CardHeader>
                  <CardTitle>Đăng ký tài khoản</CardTitle>
                  <CardDescription>
                    Kiểm soát việc tạo tài khoản học viên mới từ ứng dụng Web.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Controller
                    control={control}
                    name="registrationEnabled"
                    render={({ field }) => (
                      <div className="flex items-start justify-between gap-6 rounded-lg border p-4">
                        <div className="space-y-1">
                          <label
                            className="text-sm font-medium text-foreground"
                            htmlFor="registrationEnabled"
                          >
                            Cho phép đăng ký mới
                          </label>
                          <p
                            className="text-sm font-normal leading-5 text-muted-foreground"
                            id="registrationEnabled-description"
                          >
                            Khi tắt, người dùng chưa có tài khoản sẽ không thể
                            hoàn tất yêu cầu đăng ký.
                          </p>
                        </div>
                        <Switch
                          aria-describedby="registrationEnabled-description"
                          checked={field.value}
                          id="registrationEnabled"
                          onCheckedChange={field.onChange}
                        />
                      </div>
                    )}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            <div className="mt-6">
              <FormActions
                cancelLabel="Hoàn tác"
                isCancelDisabled={!isDirty}
                isSubmitDisabled={!isDirty}
                isSubmitting={updateSettings.isPending}
                onCancel={resetForm}
                submitLabel="Lưu thay đổi"
              />
            </div>
          </div>
        </Tabs>
      </form>
    </div>
  );
}
