import type { VocabularyCatalogItem } from "../catalog/vocabulary-catalog.js";

export const auditCategories = [
  "function-words",
  "content-recovery-candidates",
  "normalization-review",
] as const;

export type AuditCategory = (typeof auditCategories)[number];

export type UnclassifiedVocabularyAuditRecord = {
  catalogIndex: number;
  word: string;
  normalizedWord: string;
  pos: string;
  cefrLevel: string;
  primaryMeaningVi: string;
  meaningVi: string;
  reasons: string[];
};

export type UnclassifiedVocabularyAuditReport = {
  schemaVersion: 1;
  category: AuditCategory;
  totalRecords: number;
  records: UnclassifiedVocabularyAuditRecord[];
};

export type UnclassifiedVocabularyAudit = {
  totalCatalogRecords: number;
  classifiedRecords: number;
  unclassifiedRecords: number;
  reports: Record<AuditCategory, UnclassifiedVocabularyAuditReport>;
};

const functionWordPartsOfSpeech = new Set([
  "pronoun",
  "preposition",
  "determiner",
  "conjunction",
  "modal auxiliary",
  "be-verb",
  "do-verb",
  "have-verb",
]);

const contentPartsOfSpeech = new Set(["noun", "adjective", "verb"]);

const reasonPrefix: Record<AuditCategory, string> = {
  "function-words": "function-word-pos",
  "content-recovery-candidates": "content-recovery-pos",
  "normalization-review": "manual-review-pos",
};

const classifyPartOfSpeech = (pos: string): AuditCategory => {
  const normalized = pos.trim().toLowerCase();
  if (functionWordPartsOfSpeech.has(normalized)) return "function-words";
  if (contentPartsOfSpeech.has(normalized)) {
    return "content-recovery-candidates";
  }
  return "normalization-review";
};

const createReport = (
  category: AuditCategory
): UnclassifiedVocabularyAuditReport => ({
  schemaVersion: 1,
  category,
  totalRecords: 0,
  records: [],
});

export function auditUnclassifiedVocabulary(
  catalog: VocabularyCatalogItem[]
): UnclassifiedVocabularyAudit {
  const reports: Record<AuditCategory, UnclassifiedVocabularyAuditReport> = {
    "function-words": createReport("function-words"),
    "content-recovery-candidates": createReport("content-recovery-candidates"),
    "normalization-review": createReport("normalization-review"),
  };
  let unclassifiedRecords = 0;

  catalog.forEach((item, index) => {
    if ((item.topics?.length ?? 0) > 0) return;

    unclassifiedRecords += 1;
    const category = classifyPartOfSpeech(item.pos);
    const normalizedPos = item.pos.trim().toLowerCase();
    reports[category].records.push({
      catalogIndex: index + 1,
      word: item.word,
      normalizedWord: item.normalizedWord,
      pos: item.pos,
      cefrLevel: item.cefrLevel,
      primaryMeaningVi: item.primaryMeaningVi,
      meaningVi: item.meaningVi,
      reasons: [`${reasonPrefix[category]}:${normalizedPos}`],
    });
  });

  for (const category of auditCategories) {
    reports[category].totalRecords = reports[category].records.length;
  }

  const bucketTotal = auditCategories.reduce(
    (total, category) => total + reports[category].records.length,
    0
  );
  if (bucketTotal !== unclassifiedRecords) {
    throw new Error(
      `Audit bucket count ${bucketTotal} does not match unclassified count ${unclassifiedRecords}`
    );
  }

  return {
    totalCatalogRecords: catalog.length,
    classifiedRecords: catalog.length - unclassifiedRecords,
    unclassifiedRecords,
    reports,
  };
}
