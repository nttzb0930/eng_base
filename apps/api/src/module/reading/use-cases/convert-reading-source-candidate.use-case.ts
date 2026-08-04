import {
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import type { ConvertReadingSourceCandidatePayload } from "@repo/shared";

import { ReadingSourceCandidateRepository } from "../repository/reading-source-candidate.repository";
import { assertValidReadingContent } from "./reading-admin.support";

function isUniqueConflict(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "P2002"
  );
}

@Injectable()
export class ConvertReadingSourceCandidateUseCase {
  constructor(private readonly repository: ReadingSourceCandidateRepository) {}

  async execute(id: number, payload: ConvertReadingSourceCandidatePayload) {
    const candidate = await this.repository.findDetail(id);
    if (!candidate) {
      throw new NotFoundException(`Reading source candidate with ID ${id} not found`);
    }
    if (candidate.status !== "PENDING") {
      throw new ConflictException("Only pending Reading candidates can be converted");
    }
    assertValidReadingContent(payload);
    if (payload.topicId !== null && !(await this.repository.topicExists(payload.topicId))) {
      throw new NotFoundException(`Topic with ID ${payload.topicId} not found`);
    }
    try {
      return await this.repository.convertToDraft({ candidateId: id, payload });
    } catch (error) {
      if (isUniqueConflict(error)) {
        throw new ConflictException(`Reading passage slug "${payload.slug}" already exists`);
      }
      throw error;
    }
  }
}
