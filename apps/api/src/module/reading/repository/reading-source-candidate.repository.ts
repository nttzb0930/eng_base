import type {
  AdminReadingPassage,
  AdminReadingSourceCandidateDetail,
  AdminReadingSourceCandidateList,
  ConvertReadingSourceCandidatePayload,
  ReadingSourceCandidateStatus,
} from "@repo/shared";

export type ReadingSourceCandidateQuery = {
  page: number;
  limit: number;
  status?: ReadingSourceCandidateStatus;
  sourceLevel?: "1" | "2";
  search?: string;
};

export abstract class ReadingSourceCandidateRepository {
  abstract list(
    query: ReadingSourceCandidateQuery,
  ): Promise<AdminReadingSourceCandidateList>;
  abstract findDetail(
    id: number,
  ): Promise<AdminReadingSourceCandidateDetail | null>;
  abstract topicExists(topicId: number): Promise<boolean>;
  abstract convertToDraft(input: {
    candidateId: number;
    payload: ConvertReadingSourceCandidatePayload;
  }): Promise<{
    candidate: AdminReadingSourceCandidateDetail;
    passage: AdminReadingPassage;
  }>;
  abstract reject(input: {
    candidateId: number;
    reason: string;
  }): Promise<AdminReadingSourceCandidateDetail>;
}
