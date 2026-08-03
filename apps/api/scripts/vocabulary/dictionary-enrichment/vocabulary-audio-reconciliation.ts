import { createHash } from "node:crypto";

import {
  vocabularyIdentity,
  type VocabularyCatalogItem,
} from "../catalog/vocabulary-catalog.js";

const SUPPORTED_AUDIO_SOURCE = "free-dictionary-api" as const;
const SUPPORTED_AUDIO_HOST = "api.dictionaryapi.dev";

export type VocabularyAudioDatabaseRow = {
  id: number;
  normalizedWord: string;
  pos: string;
  cefrLevel: string;
  audioUrl: string | null;
  audioSource: string | null;
};

export type VocabularyAudioImport = {
  identity: string;
  databaseId: number;
  audioUrl: string;
  audioSource: typeof SUPPORTED_AUDIO_SOURCE;
};

export type VocabularyAudioReconciliationSummary = {
  catalogRecords: number;
  databaseRows: number;
  catalogAudioBefore: number;
  catalogAudioAfter: number;
  import: number;
  unchanged: number;
  catalogOnly: number;
  conflict: number;
  invalidPartial: number;
  invalidUrl: number;
  unsupportedSource: number;
  missingDatabaseIdentity: number;
  externalDatabaseIdentity: number;
  duplicateDatabaseIdentity: number;
};

export type VocabularyAudioReconciliationIssue = {
  kind:
    | "conflict"
    | "invalid-partial"
    | "invalid-url"
    | "unsupported-source"
    | "missing-database-identity"
    | "external-database-identity"
    | "duplicate-database-identity";
  identity: string;
  databaseIds: number[];
};

export type VocabularyAudioReconciliationPlan = {
  version: 1;
  databaseTarget: string;
  sourceSha256: string;
  liveSha256: string;
  planSha256: string;
  confirmation: string;
  blocked: boolean;
  summary: VocabularyAudioReconciliationSummary;
  imports: VocabularyAudioImport[];
  issues: VocabularyAudioReconciliationIssue[];
};

type AudioPair = {
  audioUrl: string | null | undefined;
  audioSource: string | null | undefined;
};

const sha256 = (value: unknown) =>
  createHash("sha256").update(JSON.stringify(value)).digest("hex");

const databaseIdentity = (row: VocabularyAudioDatabaseRow) =>
  vocabularyIdentity({
    normalizedWord: row.normalizedWord,
    pos: row.pos,
    cefrLevel: row.cefrLevel,
  } as VocabularyCatalogItem);

const hasValue = (value: string | null | undefined): value is string =>
  value !== null && value !== undefined;

const pairIsAbsent = (pair: AudioPair) =>
  !hasValue(pair.audioUrl) && !hasValue(pair.audioSource);

const pairIsComplete = (pair: AudioPair): pair is Required<AudioPair> =>
  hasValue(pair.audioUrl) &&
  hasValue(pair.audioSource) &&
  pair.audioUrl.trim().length > 0 &&
  pair.audioSource.trim().length > 0;

const pairIsPartial = (pair: AudioPair) =>
  !pairIsAbsent(pair) && !pairIsComplete(pair);

const isSupportedAudioUrl = (value: string) => {
  try {
    const parsed = new URL(value);
    return (
      parsed.protocol === "https:" &&
      parsed.hostname === SUPPORTED_AUDIO_HOST &&
      parsed.username === "" &&
      parsed.password === ""
    );
  } catch {
    return false;
  }
};

const sortedDatabaseRows = (rows: VocabularyAudioDatabaseRow[]) =>
  [...rows]
    .map((row) => ({
      identity: databaseIdentity(row),
      id: row.id,
      audioUrl: row.audioUrl,
      audioSource: row.audioSource,
    }))
    .sort(
      (left, right) =>
        left.identity.localeCompare(right.identity) || left.id - right.id
    );

const emptySummary = (
  catalog: VocabularyCatalogItem[],
  databaseRows: VocabularyAudioDatabaseRow[]
): VocabularyAudioReconciliationSummary => ({
  catalogRecords: catalog.length,
  databaseRows: databaseRows.length,
  catalogAudioBefore: catalog.filter((catalogItem) =>
    pairIsComplete({
      audioUrl: catalogItem.audioUrl,
      audioSource: catalogItem.audioSource,
    })
  ).length,
  catalogAudioAfter: 0,
  import: 0,
  unchanged: 0,
  catalogOnly: 0,
  conflict: 0,
  invalidPartial: 0,
  invalidUrl: 0,
  unsupportedSource: 0,
  missingDatabaseIdentity: 0,
  externalDatabaseIdentity: 0,
  duplicateDatabaseIdentity: 0,
});

const addIssue = (
  issues: VocabularyAudioReconciliationIssue[],
  kind: VocabularyAudioReconciliationIssue["kind"],
  identity: string,
  databaseIds: number[]
) => {
  issues.push({ kind, identity, databaseIds: [...databaseIds].sort((a, b) => a - b) });
};

export function buildVocabularyAudioReconciliationPlan(input: {
  catalog: VocabularyCatalogItem[];
  databaseRows: VocabularyAudioDatabaseRow[];
  databaseTarget: string;
}): VocabularyAudioReconciliationPlan {
  const { catalog, databaseRows, databaseTarget } = input;
  const summary = emptySummary(catalog, databaseRows);
  const imports: VocabularyAudioImport[] = [];
  const issues: VocabularyAudioReconciliationIssue[] = [];
  const catalogIdentities = new Set(catalog.map(vocabularyIdentity));
  const databaseBuckets = new Map<string, VocabularyAudioDatabaseRow[]>();

  for (const row of databaseRows) {
    const identity = databaseIdentity(row);
    const bucket = databaseBuckets.get(identity) ?? [];
    bucket.push(row);
    databaseBuckets.set(identity, bucket);
  }

  for (const [identity, bucket] of databaseBuckets) {
    if (bucket.length > 1) {
      summary.duplicateDatabaseIdentity += 1;
      addIssue(
        issues,
        "duplicate-database-identity",
        identity,
        bucket.map((row) => row.id)
      );
    }
    if (!catalogIdentities.has(identity)) {
      summary.externalDatabaseIdentity += 1;
      addIssue(
        issues,
        "external-database-identity",
        identity,
        bucket.map((row) => row.id)
      );
    }
  }

  for (const catalogItem of catalog) {
    const identity = vocabularyIdentity(catalogItem);
    const bucket = databaseBuckets.get(identity);
    if (!bucket) {
      summary.missingDatabaseIdentity += 1;
      addIssue(issues, "missing-database-identity", identity, []);
      continue;
    }
    if (bucket.length > 1) continue;

    const databaseRow = bucket[0];
    const catalogPair: AudioPair = {
      audioUrl: catalogItem.audioUrl,
      audioSource: catalogItem.audioSource,
    };
    const databasePair: AudioPair = {
      audioUrl: databaseRow.audioUrl,
      audioSource: databaseRow.audioSource,
    };

    if (pairIsPartial(catalogPair) || pairIsPartial(databasePair)) {
      summary.invalidPartial += 1;
      addIssue(issues, "invalid-partial", identity, [databaseRow.id]);
      continue;
    }

    if (pairIsAbsent(catalogPair) && pairIsAbsent(databasePair)) {
      summary.unchanged += 1;
      continue;
    }

    if (pairIsComplete(catalogPair) && pairIsAbsent(databasePair)) {
      summary.catalogOnly += 1;
      continue;
    }

    if (!pairIsComplete(databasePair)) {
      throw new Error(`Unreachable database audio state for ${identity}`);
    }

    if (databasePair.audioSource !== SUPPORTED_AUDIO_SOURCE) {
      summary.unsupportedSource += 1;
      addIssue(issues, "unsupported-source", identity, [databaseRow.id]);
      continue;
    }

    if (!isSupportedAudioUrl(databasePair.audioUrl)) {
      summary.invalidUrl += 1;
      addIssue(issues, "invalid-url", identity, [databaseRow.id]);
      continue;
    }

    if (pairIsAbsent(catalogPair)) {
      summary.import += 1;
      imports.push({
        identity,
        databaseId: databaseRow.id,
        audioUrl: databasePair.audioUrl,
        audioSource: SUPPORTED_AUDIO_SOURCE,
      });
      continue;
    }

    if (!pairIsComplete(catalogPair)) {
      throw new Error(`Unreachable catalog audio state for ${identity}`);
    }

    if (
      catalogPair.audioUrl === databasePair.audioUrl &&
      catalogPair.audioSource === databasePair.audioSource
    ) {
      summary.unchanged += 1;
      continue;
    }

    summary.conflict += 1;
    addIssue(issues, "conflict", identity, [databaseRow.id]);
  }

  imports.sort((left, right) => left.identity.localeCompare(right.identity));
  issues.sort(
    (left, right) =>
      left.kind.localeCompare(right.kind) ||
      left.identity.localeCompare(right.identity)
  );
  summary.catalogAudioAfter = summary.catalogAudioBefore + summary.import;

  const sourceSha256 = sha256(catalog);
  const liveSha256 = sha256(sortedDatabaseRows(databaseRows));
  const blocked = issues.some(
    (issue) => issue.kind !== "external-database-identity"
  );
  const core = {
    version: 1 as const,
    databaseTarget,
    sourceSha256,
    liveSha256,
    blocked,
    summary,
    imports,
    issues,
  };
  const planSha256 = sha256(core);
  const confirmation = `RECONCILE_AUDIO_${sha256({
    databaseTarget,
    sourceSha256,
    liveSha256,
    planSha256,
  })
    .slice(0, 24)
    .toUpperCase()}`;

  return {
    ...core,
    planSha256,
    confirmation,
  };
}

export function applyVocabularyAudioImports(
  catalog: VocabularyCatalogItem[],
  plan: VocabularyAudioReconciliationPlan
): VocabularyCatalogItem[] {
  if (plan.blocked) {
    throw new Error("Vocabulary audio reconciliation plan is blocked");
  }
  if (sha256(catalog) !== plan.sourceSha256) {
    throw new Error("Vocabulary catalog drifted after reconciliation planning");
  }

  const importsByIdentity = new Map(
    plan.imports.map((audioImport) => [audioImport.identity, audioImport])
  );
  return catalog.map((catalogItem) => {
    const audioImport = importsByIdentity.get(vocabularyIdentity(catalogItem));
    if (!audioImport) return catalogItem;
    return {
      ...catalogItem,
      audioUrl: audioImport.audioUrl,
      audioSource: audioImport.audioSource,
    };
  });
}
