"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { useCurrentLocale } from "@/app/i18n/use-current-locale";
import { withLocale } from "@/app/i18n/paths";
import { useSelectCourse } from "@/app/features/progress/hooks/use-user-progress";

type UseCourseSelectionProps = {
  activeCourseId?: number;
};

export function useCourseSelection({ activeCourseId }: UseCourseSelectionProps = {}) {
  const router = useRouter();
  const locale = useCurrentLocale();
  const t = useTranslations("courses");
  const selectCourse = useSelectCourse();

  const onClick = async (id: number) => {
    if (selectCourse.isPending) return;

    if (id === activeCourseId) {
      router.push(withLocale("/learn", locale));
      return;
    }

    try {
      await selectCourse.mutateAsync(id);
      router.push(withLocale("/learn", locale));
    } catch {
      toast.error(t("error"));
    }
  };

  return {
    t,
    onClick,
    pending: selectCourse.isPending,
  };
}
