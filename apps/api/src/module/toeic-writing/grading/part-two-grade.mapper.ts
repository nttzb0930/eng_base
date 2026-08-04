import type {
  ToeicWritingPartTwoGradeResult,
  ToeicWritingAiQuota,
} from "@repo/shared";

import { writingPartTwoProviderResultSchema } from "../provider/writing-ai.schemas";
import type { WritingAiGradeRecord } from "../repository/writing-ai.repository";

export function mapPartTwoGradeRecord(
  record: WritingAiGradeRecord,
  quota: ToeicWritingAiQuota,
  cached: boolean
): ToeicWritingPartTwoGradeResult {
  const result = writingPartTwoProviderResultSchema.parse(record.result);
  return {
    id: record.id,
    taskId: record.taskId,
    ...result,
    quota,
    cached,
    assistance: record.assistance,
  };
}
