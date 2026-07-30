import { Injectable } from "@nestjs/common";
import type { ReadingSourceCandidateStatus } from "@repo/shared";

import { ReadingSourceCandidateRepository } from "../repository/reading-source-candidate.repository";

@Injectable()
export class ListReadingSourceCandidatesUseCase {
  constructor(private readonly repository: ReadingSourceCandidateRepository) {}

  execute(input: {
    page?: number;
    limit?: number;
    status?: ReadingSourceCandidateStatus;
    sourceLevel?: "1" | "2";
    search?: string;
  }) {
    return this.repository.list({
      page: input.page ?? 1,
      limit: input.limit ?? 20,
      status: input.status,
      sourceLevel: input.sourceLevel,
      search: input.search?.trim() || undefined,
    });
  }
}
