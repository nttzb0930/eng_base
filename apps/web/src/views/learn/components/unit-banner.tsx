import { ArrowRight, NotebookText } from "lucide-react";
import { LocalizedLink as Link } from "@/src/components/localized-link";
import { useTranslations } from "next-intl";

import { Button } from "@/src/components/ui/button";
import { withLocale } from "@/src/lib/i18n/paths";

type UnitBannerProps = {
  title: string;
  description: string;
};

export const UnitBanner = ({ title, description }: UnitBannerProps) => {
  const t = useTranslations("learn");

  return (
    <div className="surface-panel flex w-full flex-col gap-5 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
      <div className="max-w-2xl">
        <p className="eyebrow">{t("continue")}</p>
        <h3 className="mt-1 text-2xl font-bold text-foreground">{title}</h3>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{description}</p>
      </div>

      <Link href={withLocale("/lesson")}>
        <Button
          size="default"
          variant="secondary"
          className="w-full gap-2 sm:w-auto"
        >
          <NotebookText className="h-4 w-4" aria-hidden="true" />
          {t("continue")}
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Button>
      </Link>
    </div>
  );
};
