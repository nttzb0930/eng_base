import type { AdminReadingPassage } from "@repo/shared";
import { Check, Edit2, Send, X } from "lucide-react";

import type { Column } from "@/app/components/data-table";
import { Badge } from "@/app/components/ui/badge";
import { Button } from "@/app/components/ui/button";

export function getReadingPassageColumns({
  onEdit,
  onTogglePublication,
  publicationPending,
}: {
  onEdit(passage: AdminReadingPassage): void;
  onTogglePublication(passage: AdminReadingPassage): void;
  publicationPending: boolean;
}): Column<AdminReadingPassage>[] {
  return [
    {
      accessorKey: "title",
      header: "Passage",
      cell: (passage) => (
        <div>
          <p className="font-medium">{passage.title}</p>
          <p className="mt-0.5 font-mono text-xs text-muted-foreground">
            {passage.slug}
          </p>
        </div>
      ),
    },
    { accessorKey: "cefrLevel", header: "Level" },
    {
      accessorKey: "topicTitle",
      header: "Topic",
      cell: (passage) => passage.topicTitle ?? "Không gán",
    },
    {
      header: "Câu hỏi",
      cell: (passage) => (
        <span className="tabular-nums">{passage.questions.length}</span>
      ),
    },
    {
      accessorKey: "status",
      header: "Trạng thái",
      cell: (passage) => (
        <Badge variant={passage.status === "PUBLISHED" ? "secondary" : "outline"}>
          {passage.status === "PUBLISHED" ? <Check aria-hidden="true" /> : null}
          {passage.status === "PUBLISHED" ? "Đã xuất bản" : "Bản nháp"}
        </Badge>
      ),
    },
    {
      className: "text-right",
      header: "Hành động",
      cell: (passage) => (
        <div className="flex justify-end gap-2">
          <Button onClick={() => onEdit(passage)} size="sm" variant="outline">
            <Edit2 aria-hidden="true" /> Sửa
          </Button>
          <Button
            disabled={publicationPending}
            onClick={() => onTogglePublication(passage)}
            size="sm"
            variant={passage.status === "PUBLISHED" ? "outline" : "default"}
          >
            {passage.status === "PUBLISHED" ? (
              <X aria-hidden="true" />
            ) : (
              <Send aria-hidden="true" />
            )}
            {passage.status === "PUBLISHED" ? "Gỡ xuất bản" : "Xuất bản"}
          </Button>
        </div>
      ),
    },
  ];
}
