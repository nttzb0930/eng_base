import { Injectable, NotFoundException } from "@nestjs/common";

import { ReadingSourceCandidateRepository } from "../repository/reading-source-candidate.repository";

@Injectable()
export class GetReadingSourceCandidateUseCase {
  constructor(private readonly repository: ReadingSourceCandidateRepository) {}

  async execute(id: number) {
    const candidate = await this.repository.findDetail(id);
    if (!candidate) {
      throw new NotFoundException(`Reading source candidate with ID ${id} not found`);
    }
    return candidate;
  }
}
