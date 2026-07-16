import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export function TableSkeleton({ columnsCount = 5, rowsCount = 5 }: { columnsCount?: number; rowsCount?: number }) {
  return (
    <div className="w-full rounded-xl border border-zinc-200 bg-white overflow-hidden shadow-sm">
      <Table>
        <TableHeader>
          <TableRow className="bg-zinc-50 hover:bg-zinc-50/50">
            {Array.from({ length: columnsCount }).map((_, idx) => (
              <TableHead key={idx}>
                <div className="h-4 w-20 rounded bg-zinc-200 animate-pulse" />
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: rowsCount }).map((_, rowIdx) => (
            <TableRow key={rowIdx}>
              {Array.from({ length: columnsCount }).map((_, colIdx) => (
                <TableCell key={colIdx}>
                  <div className="h-4 w-full rounded bg-zinc-100 animate-pulse" />
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
