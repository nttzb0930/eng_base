import Image from "next/image";
import { MobileSidebar } from "./MobileSidebar";

const appName = process.env.NEXT_PUBLIC_APP_NAME?.trim() || "English Base";

export const MobileHeader = () => {
  return (
    <nav className="bg-card/95 sticky top-0 z-50 flex h-16 w-full shrink-0 items-center justify-between border-b px-4 backdrop-blur lg:hidden">
      <MobileSidebar />
      <div className="flex items-center gap-2.5 font-bold tracking-tight">
        <Image
          src="/mascot.svg"
          alt={appName}
          width={32}
          height={32}
          className="h-8 w-8 shrink-0 object-contain"
        />
        <span>{appName}</span>
      </div>
      <span className="h-10 w-10" aria-hidden="true" />
    </nav>
  );
};
