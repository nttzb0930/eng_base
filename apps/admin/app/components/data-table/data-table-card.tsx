import React from "react";
import { Card, CardContent, CardHeader } from "@/app/components/ui/card";
import { Input } from "@/app/components/ui/input";
import { Search } from "lucide-react";
import { DataTable, type DataTableProps } from "./data-table";

export interface DataTableCardProps<T> extends DataTableProps<T> {
  searchQuery?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  isFetching?: boolean;
  toolbar?: React.ReactNode;
}

export function DataTableCard<T>({
  searchQuery,
  searchPlaceholder = "Tìm kiếm...",
  onSearchChange,
  isFetching,
  toolbar,
  ...tableProps
}: DataTableCardProps<T>) {
  return (
    <Card className="border-zinc-200 bg-white shadow-sm overflow-hidden">
      <CardHeader className="border-b border-zinc-100 pb-3 pt-4 px-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {onSearchChange !== undefined && (
            <div className="relative w-full max-w-sm">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
              <Input
                placeholder={searchPlaceholder}
                className="pl-9 bg-white border-zinc-200 text-zinc-900 placeholder:text-zinc-400 focus-visible:ring-zinc-400 h-9 text-sm"
                value={searchQuery ?? ""}
                onChange={(e) => onSearchChange(e.target.value)}
              />
            </div>
          )}
          {toolbar && (
            <div className="flex items-center gap-2 shrink-0">{toolbar}</div>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="p-4">
          <DataTable isFetching={isFetching} {...tableProps} />
        </div>
      </CardContent>
    </Card>
  );
}
