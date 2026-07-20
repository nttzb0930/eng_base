import type { PropsWithChildren } from "react";

import { LearnerShell } from "@/app/components/layout/LearnerShell";

export default function SessionLayout({ children }: PropsWithChildren) {
  return <LearnerShell mode="session">{children}</LearnerShell>;
}
