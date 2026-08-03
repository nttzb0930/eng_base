import type { WritingAiRepository } from "../repository/writing-ai.repository";
import type { WritingCoachingTaskSource } from "./get-toeic-writing-coaching.use-case";

export class RecordToeicWritingAssistanceUseCase {
  constructor(
    private readonly tasks: WritingCoachingTaskSource,
    private readonly repository: WritingAiRepository
  ) {}

  async execute(
    userId: string,
    taskId: number,
    contentVersion: string,
    kind: "OUTLINE" | "VOCABULARY" | "SAMPLE" | "COMMUNITY_RESTORE"
  ) {
    const task = await this.tasks.getPublishedCoachingTask(taskId);
    if (task.contentVersion !== contentVersion) return { recorded: false };
    await this.repository.recordAssistance({
      userId,
      taskId,
      contentVersion,
      kind,
    });
    return { recorded: true };
  }
}
