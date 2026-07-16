"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

import { Button } from "@/src/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/src/components/ui/dialog";
import { useHeartsModal } from "@/src/stores/use-hearts-modal";
import { withLocale } from "@/src/lib/i18n/paths";
import { useCurrentLocale } from "@/src/lib/i18n/use-current-locale";

import { useTransition } from "react";
import { Loader2 } from "lucide-react";
import { refillHearts, resetLessonProgress } from "@/src/services/progress/user-progress.service";

export const HeartsModal = () => {
  const t = useTranslations("modals");
  const locale = useCurrentLocale();
  const router = useRouter();
  const { isOpen, lessonId, close } = useHeartsModal();
  const [isPending, startTransition] = useTransition();

  const onRefillAndRestart = () => {
    startTransition(async () => {
      try {
        await refillHearts();
        if (lessonId) {
          await resetLessonProgress(lessonId);
          close();
          router.push(withLocale(`/lesson/${lessonId}`, locale));
        } else {
          close();
          router.push(withLocale("/learn", locale));
        }
      } catch (error) {
        close();
        router.push(withLocale("/learn", locale));
      }
    });
  };

  const onGoBackToMap = () => {
    close();
    router.push(withLocale("/learn", locale));
  };

  return (
    <Dialog open={isOpen} onOpenChange={isPending ? undefined : close}>
      <DialogContent className="max-w-md" closeLabel={t("close")}>
        <DialogHeader>
          <div className="mb-5 flex w-full items-center justify-center">
            <Image
              src="/mascot_bad.svg"
              alt={t("mascotBadAlt")}
              height={80}
              width={80}
            />
          </div>

          <DialogTitle className="text-center text-2xl font-bold">
            {t("heartsTitle")}
          </DialogTitle>

          <DialogDescription className="text-center text-base">
            {t("heartsDescription")}
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="mb-4">
          <div className="flex w-full flex-col gap-y-4">
            <Button
              variant="primary"
              className="w-full flex items-center justify-center gap-2"
              size="lg"
              onClick={onRefillAndRestart}
              disabled={isPending}
            >
              {isPending && <Loader2 className="h-5 w-5 animate-spin" />}
              {t("goPractice")}
            </Button>

            <Button
              variant="primaryOutline"
              className="w-full"
              size="lg"
              onClick={onGoBackToMap}
              disabled={isPending}
            >
              {t("noThanks")}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
