import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import type { RejectReadingSourceCandidatePayload } from "@repo/shared";

import { ReadingSourceCandidateRepository } from "../repository/reading-source-candidate.repository";

@Injectable()
export class RejectReadingSourceCandidateUseCase {
  constructor(private readonly repository: ReadingSourceCandidateRepository) {}

  async execute(id: number, payload: RejectReadingSourceCandidatePayload) {
    const reason = payload.reason.trim();
    if (!reason) throw new BadRequestException("Rejection reason is required");
    const candidate = await this.repository.findDetail(id);
    if (!candidate) {
      throw new NotFoundException(`Reading source candidate with ID ${id} not found`);
    }
    if (candidate.status !== "PENDING") {
      throw new ConflictException("Only pending Reading candidates can be rejected");
    }
    return this.repository.reject({ candidateId: id, reason });
  }
}
