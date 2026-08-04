import { Skeleton } from "@/app/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/app/components/ui/table";

type TableSkeletonProps = {
  columnsCount?: number;
  rowsCount?: number;
};

export function TableSkeleton({
  columnsCount = 5,
  rowsCount = 5,
}: TableSkeletonProps) {
  return (
    <div className="w-full overflow-hidden rounded-lg border bg-card">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/40 hover:bg-muted/40">
            {Array.from({ length: columnsCount }, (_, index) => (
              <TableHead key={`skeleton-heading-${index}`}>
                <Skeleton className="h-4 w-20" />
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: rowsCount }, (_, rowIndex) => (
            <TableRow key={`skeleton-row-${rowIndex}`}>
              {Array.from({ length: columnsCount }, (_, columnIndex) => (
                <TableCell key={`skeleton-cell-${rowIndex}-${columnIndex}`}>
                  <Skeleton className="h-4 w-full" />
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
