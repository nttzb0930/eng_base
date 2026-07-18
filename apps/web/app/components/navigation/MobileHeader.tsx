import { MobileSidebar } from "./MobileSidebar";
import { Sparkles } from "lucide-react";

const appName = process.env.NEXT_PUBLIC_APP_NAME?.trim() || "English Base";

export const MobileHeader = () => {
  return (
    <nav className="bg-card/95 fixed top-0 z-50 flex h-16 w-full items-center justify-between border-b px-4 backdrop-blur lg:hidden">
      <MobileSidebar />
      <div className="flex items-center gap-2 font-bold tracking-tight">
        <span className="bg-primary text-primary-foreground grid h-8 w-8 place-items-center rounded-lg">
          <Sparkles className="h-4 w-4" aria-hidden="true" />
        </span>
        {appName}
      </div>
      <span className="h-10 w-10" aria-hidden="true" />
    </nav>
  );
};
