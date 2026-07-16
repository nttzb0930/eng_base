import { CheckCircle, XCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import { useKey, useMedia } from "react-use";

import { Button } from "@/src/components/ui/button";
import { withLocale } from "@/src/lib/i18n/paths";
import { useCurrentLocale } from "@/src/lib/i18n/use-current-locale";
import { cn } from "@/src/lib/utils";

type FooterProps = {
  onCheck: () => void;
  status: "correct" | "wrong" | "none" | "completed";
  disabled?: boolean;
  lessonId?: number;
  wrongAction?: "retry" | "next";
};

export const Footer = ({
  onCheck,
  status,
  disabled,
  lessonId,
  wrongAction = "retry",
}: FooterProps) => {
  const t = useTranslations("lesson");
  const locale = useCurrentLocale();
  useKey("Enter", onCheck, {}, [onCheck]);
  const isMobile = useMedia("(max-width: 1024px)");

  return (
    <footer
      className={cn(
        "min-h-[88px] shrink-0 border-t bg-background lg:min-h-[104px]",
        status === "correct" && "border-transparent bg-green-100",
        status === "wrong" && "border-transparent bg-rose-100"
      )}
    >
      <div className="mx-auto flex min-h-[88px] max-w-[1140px] items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:min-h-[104px] lg:px-10">
        {status === "correct" && (
          <div className="flex items-center text-base font-bold text-green-500 lg:text-2xl">
            <CheckCircle className="mr-4 h-6 w-6 lg:h-10 lg:w-10" />
            {t("nicelyDone")}
          </div>
        )}

        {status === "wrong" && (
          <div className="flex items-center text-base font-bold text-rose-500 lg:text-2xl">
            <XCircle className="mr-4 h-6 w-6 lg:h-10 lg:w-10" />
            {t("tryAgain")}
          </div>
        )}

        {status === "completed" && (
          <Button
            variant="default"
            size={isMobile ? "sm" : "lg"}
            onClick={() =>
              (window.location.href = withLocale(
                `/lesson/${lessonId}`,
                locale
              ))
            }
          >
            {t("practiceAgain")}
          </Button>
        )}

        <Button
          disabled={disabled}
          aria-disabled={disabled}
          className="ml-auto"
          onClick={onCheck}
          size={isMobile ? "sm" : "lg"}
          variant={status === "wrong" ? "danger" : "secondary"}
        >
          {status === "none" && t("check")}
          {status === "correct" && t("next")}
          {status === "wrong" &&
            (wrongAction === "next" ? t("next") : t("retry"))}
          {status === "completed" && t("continue")}
        </Button>
      </div>
    </footer>
  );
};
