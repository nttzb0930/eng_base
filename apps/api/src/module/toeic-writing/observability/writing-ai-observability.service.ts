import { Injectable } from "@nestjs/common";

import { ApplicationLogger } from "../../../common/logging";

export type WritingAiEvent = {
  name: "grade_completed" | "grade_failed" | "context_resolved";
  part: 1 | 2;
  model?: string;
  promptVersion?: string;
  contextSource?: "ENRICHED" | "DIRECT_IMAGE";
  latencyBucket?: "LT_1S" | "1_5S" | "5_20S" | "GT_20S";
  outcome: "SUCCESS" | "FAILURE";
  schemaRepairUsed?: boolean;
  cacheHit?: boolean;
  quotaCharged?: boolean;
};

@Injectable()
export class WritingAiObservabilityService {
  constructor(private readonly logger: ApplicationLogger) {}

  record(event: WritingAiEvent) {
    const safe: WritingAiEvent = {
      name: event.name,
      part: event.part,
      outcome: event.outcome,
      ...(event.model ? { model: event.model } : {}),
      ...(event.promptVersion ? { promptVersion: event.promptVersion } : {}),
      ...(event.contextSource ? { contextSource: event.contextSource } : {}),
      ...(event.latencyBucket ? { latencyBucket: event.latencyBucket } : {}),
      ...(event.schemaRepairUsed !== undefined
        ? { schemaRepairUsed: event.schemaRepairUsed }
        : {}),
      ...(event.cacheHit !== undefined ? { cacheHit: event.cacheHit } : {}),
      ...(event.quotaCharged !== undefined
        ? { quotaCharged: event.quotaCharged }
        : {}),
    };
    this.logger.info("Writing AI event", safe, "WRITING_AI");
  }
}
