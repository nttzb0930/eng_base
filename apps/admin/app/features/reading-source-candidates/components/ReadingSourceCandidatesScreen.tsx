"use client";

import { useState } from "react";
import { Search } from "lucide-react";

import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/app/components/ui/table";
import { useReadingSourceCandidates } from "../hooks/use-reading-source-candidates";
import { ReadingSourceCandidateReviewDialog } from "./ReadingSourceCandidateReviewDialog";

export function ReadingSourceCandidatesScreen() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<"" | "PENDING" | "CONVERTED" | "REJECTED">("PENDING");
  const [sourceLevel, setSourceLevel] = useState<"" | "1" | "2">("");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const query = useReadingSourceCandidates({
    page, limit: 20, status: status || undefined,
    sourceLevel: sourceLevel || undefined, search: search.trim() || undefined,
  });
  const pages = Math.max(1, Math.ceil((query.data?.total ?? 0) / 20));

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 p-4 md:p-6">
      <header className="border-b border-zinc-200 pb-5">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-600">Reading · Source review</p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-zinc-950">Kiểm duyệt Reading candidate</h1>
        <p className="mt-1 max-w-2xl text-sm leading-6 text-zinc-500">Đối chiếu nguồn, gán CEFR và chuyển nội dung thành draft trước khi xuất bản.</p>
      </header>
      <section className="grid gap-3 sm:grid-cols-3">
        <label className="relative">
          <Search className="pointer-events-none absolute left-3 top-3 size-4 text-zinc-400" />
          <Input className="pl-9" aria-label="Tìm candidate" placeholder="Tiêu đề hoặc source ID" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} />
        </label>
        <select aria-label="Lọc trạng thái" className="h-10 rounded-md border bg-white px-3 text-sm" value={status} onChange={(event) => { setStatus(event.target.value as typeof status); setPage(1); }}>
          <option value="">Tất cả trạng thái</option><option value="PENDING">Pending</option><option value="CONVERTED">Converted</option><option value="REJECTED">Rejected</option>
        </select>
        <select aria-label="Lọc level nguồn" className="h-10 rounded-md border bg-white px-3 text-sm" value={sourceLevel} onChange={(event) => { setSourceLevel(event.target.value as typeof sourceLevel); setPage(1); }}>
          <option value="">Tất cả source level</option><option value="1">Level 1</option><option value="2">Level 2</option>
        </select>
      </section>
      <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
        <Table>
          <TableHeader><TableRow><TableHead>Candidate</TableHead><TableHead>Level</TableHead><TableHead>Câu hỏi</TableHead><TableHead>Trạng thái</TableHead><TableHead className="text-right">Thao tác</TableHead></TableRow></TableHeader>
          <TableBody>
            {query.isLoading && <TableRow><TableCell colSpan={5} className="h-32 text-center text-zinc-500">Đang tải danh sách…</TableCell></TableRow>}
            {query.isError && <TableRow><TableCell colSpan={5} className="h-32 text-center text-red-600">Không thể tải candidate.</TableCell></TableRow>}
            {!query.isLoading && !query.isError && !query.data?.items.length && <TableRow><TableCell colSpan={5} className="h-32 text-center text-zinc-500">Không có candidate phù hợp.</TableCell></TableRow>}
            {query.data?.items.map((item) => (
              <TableRow key={item.id}>
                <TableCell><p className="font-medium text-zinc-950">{item.sourceTitle}</p><p className="mt-1 max-w-80 truncate font-mono text-xs text-zinc-500">{item.sourceId}</p></TableCell>
                <TableCell>{item.sourceLevel}</TableCell><TableCell>{item.questionCount}</TableCell><TableCell>{item.status}</TableCell>
                <TableCell className="text-right"><Button size="sm" variant="outline" onClick={() => setSelectedId(item.id)}>Xem và duyệt</Button></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <footer className="flex items-center justify-between text-sm text-zinc-500">
        <span>{query.data?.total ?? 0} candidate</span>
        <div className="flex items-center gap-2"><Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage((value) => value - 1)}>Trước</Button><span>{page}/{pages}</span><Button size="sm" variant="outline" disabled={page >= pages} onClick={() => setPage((value) => value + 1)}>Sau</Button></div>
      </footer>
      <ReadingSourceCandidateReviewDialog candidateId={selectedId} onClose={() => setSelectedId(null)} />
    </div>
  );
}
