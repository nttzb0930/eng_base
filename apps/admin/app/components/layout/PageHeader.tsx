import { cn } from "@/app/utils/cn";

type PageHeaderProps = {
  actions?: React.ReactNode;
  description?: string;
  eyebrow?: string;
  title: string;
};

export function PageHeader({
  actions,
  description,
  eyebrow,
  title,
}: PageHeaderProps) {
  return (
    <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0 space-y-1">
        {eyebrow ? (
          <p className="text-xs font-medium text-muted-foreground">{eyebrow}</p>
        ) : null}
        <h2 className="text-2xl font-semibold tracking-normal text-foreground">
          {title}
        </h2>
        {description ? (
          <p className="max-w-2xl text-sm font-normal text-muted-foreground">
            {description}
          </p>
        ) : null}
      </div>
      {actions ? (
        <div className={cn("flex shrink-0 flex-wrap items-center gap-2")}>
          {actions}
        </div>
      ) : null}
    </header>
  );
}
