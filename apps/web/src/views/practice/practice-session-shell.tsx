"use client";

import { Button } from "@/src/components/ui/button";

type PracticeSessionShellProps = {
  children: React.ReactNode;
  footer: React.ReactNode;
  exitLabel: string;
  onExit: () => void;
  percentage: number;
  current: number;
  total: number;
};

export function PracticeSessionShell({
  children,
  footer,
  exitLabel,
  onExit,
  percentage,
  current,
  total,
}: PracticeSessionShellProps) {
  return (
    <div className="flex h-[calc(100dvh-7rem)] min-h-0 flex-col overflow-hidden lg:h-[calc(100dvh-5rem)]">
      <header className="flex shrink-0 items-center gap-4 border-b px-2 py-4 sm:px-6 lg:gap-6">
        <Button variant="ghost" size="sm" onClick={onExit}>
          {exitLabel}
        </Button>
        <div className="h-3 flex-1 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-[width] duration-500"
            style={{ width: `${Math.min(100, Math.max(0, percentage))}%` }}
          />
        </div>
        <p className="tabular shrink-0 text-sm font-semibold text-muted-foreground">
          {current}/{total}
        </p>
      </header>

      <main className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        <div className="flex min-h-full items-start justify-center py-6 lg:items-center lg:py-8">
          <div className="flex w-full max-w-[680px] flex-col gap-y-6 px-4 sm:px-6 lg:gap-y-8 lg:px-0">
            {children}
          </div>
        </div>
      </main>

      {footer}
    </div>
  );
}
