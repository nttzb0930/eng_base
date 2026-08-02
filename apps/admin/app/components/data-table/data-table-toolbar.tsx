import { Search } from "lucide-react";

import { Input } from "@/app/components/ui/input";

type DataTableToolbarProps = {
  actions?: React.ReactNode;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  searchQuery?: string;
};

export function DataTableToolbar({
  actions,
  onSearchChange,
  searchPlaceholder = "Tìm kiếm...",
  searchQuery = "",
}: DataTableToolbarProps) {
  if (onSearchChange === undefined && !actions) return null;

  return (
    <div className="flex flex-col gap-3 border-b px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
      {onSearchChange !== undefined ? (
        <div className="relative w-full max-w-sm">
          <Search
            aria-hidden="true"
            className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            aria-label="Tìm kiếm trong bảng"
            className="pl-9"
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder={searchPlaceholder}
            value={searchQuery}
          />
        </div>
      ) : (
        <span />
      )}
      {actions ? (
        <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>
      ) : null}
    </div>
  );
}
