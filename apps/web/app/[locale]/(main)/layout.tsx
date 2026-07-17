import type { PropsWithChildren } from "react";

import { LearnerShell } from "@/app/components/layout/LearnerShell";

export default function MainLayout({ children }: PropsWithChildren) {
  return <LearnerShell>{children}</LearnerShell>;
}
