import type { PropsWithChildren } from "react";

import { cn } from "@/app/utils/cn";

type ToeicBrowseContainerProps = PropsWithChildren<{
  className?: string;
}>;

export function ToeicBrowseContainer({
  children,
  className,
}: ToeicBrowseContainerProps) {
  return <div className={cn("w-full pb-12", className)}>{children}</div>;
}
