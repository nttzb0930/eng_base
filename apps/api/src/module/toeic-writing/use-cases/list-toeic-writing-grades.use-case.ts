import type {
  ToeicWritingGradeHistoryItem,
  ToeicWritingGradeHistoryPage,
} from "@repo/shared";

import type { WritingAiRepository } from "../repository/writing-ai.repository";
import { writingPartOneProviderResultSchema } from "../provider/writing-ai.schemas";
import { writingPartTwoProviderResultSchema } from "../provider/writing-ai.schemas";

export class ListToeicWritingGradesUseCase {
  constructor(private readonly repository: WritingAiRepository) {}

  async execute(
    userId: string,
    taskId: number,
    cursor: number | undefined,
    limit: number
  ): Promise<ToeicWritingGradeHistoryPage> {
    const rows = await this.repository.listOwnedGrades(
      userId,
      taskId,
      cursor,
      limit
    );
    const hasMore = rows.length > limit;
    const pageRows = hasMore ? rows.slice(0, limit) : rows;
    const items: ToeicWritingGradeHistoryItem[] = pageRows.map((row) => ({
      id: row.id,
      taskId: row.taskId,
      part: row.part,
      score: (row.part === 2
        ? writingPartTwoProviderResultSchema.parse(row.result)
        : writingPartOneProviderResultSchema.parse(row.result)).score,
      responseText: row.responseText,
      createdAt: row.createdAt.toISOString(),
    }));
    return {
      items,
      nextCursor: hasMore ? (pageRows.at(-1)?.id ?? null) : null,
    };
  }
}
