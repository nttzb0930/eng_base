"use client";

import Image from "next/image";
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
import { usePracticeModal } from "@/src/stores/use-practice-modal";

export const PracticeModal = () => {
  const t = useTranslations("modals");
  const { isOpen, close } = usePracticeModal();

  return (
    <Dialog open={isOpen} onOpenChange={close}>
      <DialogContent className="max-w-md" closeLabel={t("close")}>
        <DialogHeader>
          <div className="mb-5 flex w-full items-center justify-center">
            <Image
              src="/heart.svg"
              alt={t("heartAlt")}
              height={100}
              width={100}
            />
          </div>

          <DialogTitle className="text-center text-2xl font-bold">
            {t("practiceTitle")}
          </DialogTitle>

          <DialogDescription className="text-center text-base">
            {t("practiceDescription")}
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="mb-4">
          <div className="flex w-full flex-col gap-y-4">
            <Button
              variant="primary"
              className="w-full"
              size="lg"
              onClick={close}
            >
              {t("understand")}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
