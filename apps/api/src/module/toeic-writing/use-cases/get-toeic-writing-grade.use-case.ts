import type { ToeicWritingPartOneGradeDetail } from "@repo/shared";

import type { WritingAiRepository } from "../repository/writing-ai.repository";
import { writingGradeNotFound } from "../toeic-writing.errors";
import { writingPartOneProviderResultSchema } from "../provider/writing-ai.schemas";

export class GetToeicWritingGradeUseCase {
  constructor(private readonly repository: WritingAiRepository) {}

  async execute(
    userId: string,
    gradeId: number
  ): Promise<ToeicWritingPartOneGradeDetail> {
    const record = await this.repository.findOwnedGradeById(userId, gradeId);
    if (!record) return writingGradeNotFound();
    if (record.part !== 1) return writingGradeNotFound();

    const result = writingPartOneProviderResultSchema.parse(record.result);
    return {
      id: record.id,
      taskId: record.taskId,
      ...result,
      assistance: record.assistance,
      responseText: record.responseText,
      createdAt: record.createdAt.toISOString(),
    };
  }
}
