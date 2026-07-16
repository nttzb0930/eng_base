import { MobileSidebar } from "./mobile-sidebar";
import { Sparkles } from "lucide-react";

export const MobileHeader = () => {
  return (
    <nav className="fixed top-0 z-50 flex h-16 w-full items-center justify-between border-b bg-card/95 px-4 backdrop-blur lg:hidden">
      <MobileSidebar />
      <div className="flex items-center gap-2 font-bold tracking-tight">
        <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-primary-foreground">
          <Sparkles className="h-4 w-4" aria-hidden="true" />
        </span>
        VoCaBu
      </div>
      <span className="h-10 w-10" aria-hidden="true" />
    </nav>
  );
};
