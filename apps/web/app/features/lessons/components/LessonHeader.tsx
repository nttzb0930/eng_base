import { X } from "lucide-react";
import Image from "next/image";
import { useTranslations } from "next-intl";

import { Progress } from "@/app/components/ui/progress";
import { useExitModal } from "@/src/stores/use-exit-modal";

type HeaderProps = {
  hearts: number;
  percentage: number;
};

export const Header = ({ hearts, percentage }: HeaderProps) => {
  const t = useTranslations("lesson");
  const { open } = useExitModal();

  return (
    <header className="mx-auto flex w-full max-w-[1140px] shrink-0 items-center justify-between gap-x-4 px-4 py-4 sm:px-6 lg:gap-x-7 lg:px-10 lg:py-6">
      <X
        onClick={open}
        aria-label={t("closeLesson")}
        className="cursor-pointer text-slate-500 transition hover:opacity-75"
      />

      <Progress value={percentage} />

      <div className="flex items-center font-bold text-rose-500">
        <Image
          src="/heart.svg"
          height={28}
          width={28}
          alt={t("heartAlt")}
          className="mr-2"
        />
        {hearts}
      </div>
    </header>
  );
};
