"use client";

import Image from "next/image";
import { LocalizedLink as Link } from "@/app/components/navigation/LocalizedLink";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";

import { Button } from "@/app/components/ui/button";
import { withLocale } from "@/app/i18n/paths";
import { useCurrentLocale } from "@/app/i18n/use-current-locale";
import { cn } from "@/app/utils/cn";

type SidebarItemProps = {
  label: string;
  iconSrc: string;
  href: string;
  activeHrefs?: string[];
};

export const SidebarItem = ({
  label,
  iconSrc,
  href,
  activeHrefs = [href],
}: SidebarItemProps) => {
  const pathname = usePathname();
  const locale = useCurrentLocale();
  const localizedHref = withLocale(href, locale);
  const isActive = activeHrefs.some((activeHref) => {
    const localizedActiveHref = withLocale(activeHref, locale);
    return (
      pathname === localizedActiveHref ||
      pathname.startsWith(localizedActiveHref + "/")
    );
  });

  return (
    <Button
      variant="sidebar"
      className={cn(
        "relative h-12 justify-start overflow-hidden px-3",
        isActive ? "font-semibold text-primary" : "text-muted-foreground"
      )}
      asChild
    >
      <Link href={localizedHref}>
        {isActive && (
          <motion.div
            layoutId="activeSidebarIndicator"
            className="absolute inset-0 rounded-xl bg-primary/10"
            transition={{
              type: "spring",
              stiffness: 150,
              damping: 20
            }}
          />
        )}
        <div className="z-10 flex w-full items-center">
          <Image
            src={iconSrc}
            alt={label}
            className="mr-3 h-6 w-6"
            height={24}
            width={24}
          />
          <span>{label}</span>
        </div>
      </Link>
    </Button>
  );
};
