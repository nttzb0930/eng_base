"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { upsertUserProgress } from "@/src/services/progress/user-progress.service";

type UseCoursesProps = {
  activeCourseId?: number;
};

export function useCourses({ activeCourseId }: UseCoursesProps = {}) {
  const router = useRouter();
  const t = useTranslations("courses");
  const [pending, startTransition] = useTransition();

  const onClick = (id: number) => {
    if (pending) return;

    if (id === activeCourseId) return router.push("/learn");

    startTransition(async () => {
      try {
        await upsertUserProgress(id);
        router.push("/learn");
      } catch {
        toast.error(t("error"));
      }
    });
  };

  return {
    t,
    onClick,
    pending,
  };
}
