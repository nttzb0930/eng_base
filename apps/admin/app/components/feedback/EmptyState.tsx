import { Inbox, type LucideIcon } from "lucide-react";

type EmptyStateProps = {
  action?: React.ReactNode;
  description: string;
  icon?: LucideIcon;
  title: string;
};

export function EmptyState({
  action,
  description,
  icon: Icon = Inbox,
  title,
}: EmptyStateProps) {
  return (
    <div className="flex min-h-56 flex-col items-center justify-center rounded-lg border border-dashed bg-muted/20 px-6 py-10 text-center">
      <span className="mb-4 flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <Icon className="size-5" />
      </span>
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      <p className="mt-1 max-w-md text-sm font-normal text-muted-foreground">
        {description}
      </p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}
