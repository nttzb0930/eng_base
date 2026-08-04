import { Card, CardContent } from "@/app/components/ui/card";

import { DataTable } from "./data-table";
import { DataTableToolbar } from "./data-table-toolbar";
import type { DataTableProps } from "./data-table.types";

export interface DataTableCardProps<T> extends DataTableProps<T> {
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  searchQuery?: string;
  toolbar?: React.ReactNode;
}

export function DataTableCard<T>({
  onSearchChange,
  searchPlaceholder = "Tìm kiếm...",
  searchQuery,
  toolbar,
  ...tableProps
}: DataTableCardProps<T>) {
  return (
    <Card className="gap-0 overflow-hidden py-0 shadow-xs">
      <DataTableToolbar
        actions={toolbar}
        onSearchChange={onSearchChange}
        searchPlaceholder={searchPlaceholder}
        searchQuery={searchQuery}
      />
      <CardContent className="p-4">
        <DataTable {...tableProps} />
      </CardContent>
    </Card>
  );
}
