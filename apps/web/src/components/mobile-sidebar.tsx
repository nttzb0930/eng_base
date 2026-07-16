"use client";

import { Menu } from "lucide-react";
import { useTranslations } from "next-intl";

import { Sheet, SheetContent, SheetTrigger } from "@/src/components/ui/sheet";

import { Sidebar } from "./sidebar";

export const MobileSidebar = () => {
  const t = useTranslations("common");

  return (
    <Sheet>
      <SheetTrigger className="grid h-10 w-10 place-items-center rounded-lg text-muted-foreground hover:bg-accent" aria-label="Open navigation">
        <Menu className="h-5 w-5" />
      </SheetTrigger>

      <SheetContent
        className="z-[100] p-0"
        side="left"
        closeLabel={t("close")}
      >
        <Sidebar />
      </SheetContent>
    </Sheet>
  );
};
