import type {
  AdminReadingSourceCandidateDetail,
  AdminReadingSourceCandidateSummary,
  ReadingSourceCandidateStatus,
} from "@repo/shared";

type CandidateRecord = {
  id: number;
  source: string;
  source_id: string;
  source_version: string;
  source_level: string;
  source_title: string;
  source_topic: string | null;
  status: string;
  content_sha256: string;
  license_reference: string;
  canonical_json: unknown;
  source_html: string;
  plain_text_draft: string;
  rejection_reason: string | null;
  converted_passage_id: number | null;
  created_at: Date;
};

type CanonicalJson = {
  questions?: AdminReadingSourceCandidateDetail["questions"];
  vocabulary?: unknown[];
};

export function mapReadingSourceCandidateSummary(
  record: CandidateRecord,
): AdminReadingSourceCandidateSummary {
  const canonical = record.canonical_json as CanonicalJson;
  return {
    id: record.id,
    source: record.source,
    sourceId: record.source_id,
    sourceVersion: record.source_version,
    sourceLevel: record.source_level as "1" | "2",
    sourceTitle: record.source_title,
    sourceTopic: record.source_topic,
    status: record.status as ReadingSourceCandidateStatus,
    contentSha256: record.content_sha256,
    licenseReference: record.license_reference,
    questionCount: canonical.questions?.length ?? 0,
    importedAt: record.created_at.toISOString(),
    convertedPassageId: record.converted_passage_id,
  };
}

export function mapReadingSourceCandidateDetail(
  record: CandidateRecord,
): AdminReadingSourceCandidateDetail {
  const canonical = record.canonical_json as CanonicalJson;
  return {
    ...mapReadingSourceCandidateSummary(record),
    sourceHtml: record.source_html,
    plainTextDraft: record.plain_text_draft,
    questions: canonical.questions ?? [],
    vocabulary: canonical.vocabulary ?? [],
    rejectionReason: record.rejection_reason,
  };
}
