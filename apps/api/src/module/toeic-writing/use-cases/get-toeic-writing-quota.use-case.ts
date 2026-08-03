import type { WritingAiRepository } from "../repository/writing-ai.repository";

export class GetToeicWritingQuotaUseCase {
  constructor(
    private readonly repository: WritingAiRepository,
    private readonly dailyLimit: number
  ) {}

  execute(userId: string) {
    return this.repository.getQuota(userId, "TOEIC_WRITING", this.dailyLimit);
  }
}
