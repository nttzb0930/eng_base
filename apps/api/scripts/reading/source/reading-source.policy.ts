import type { ReadingSourceAccess } from "./reading-source.types.js";

const CHECKSUM_PREFIX_LENGTH = 12;

export function classifyReadingSourceAccess(input: {
  isFree: boolean;
  isHidden: boolean;
}): ReadingSourceAccess {
  if (input.isHidden) {
    return {
      ...input,
      classification: "EXCLUDED_HIDDEN",
    };
  }
  if (!input.isFree) {
    return {
      ...input,
      classification: "EXCLUDED_NOT_FREE",
    };
  }
  return {
    ...input,
    classification: "BASIC_FREE",
  };
}

function duplicateCount(values: string[]) {
  return values.length - new Set(values).size;
}

export function assertApprovedReadingInventory(input: {
  approvedSha256: string;
  liveSha256: string;
  liveAcceptedSourceIds: string[];
  approvedAcceptedSourceIds: string[];
}) {
  const approvedDuplicates = duplicateCount(input.approvedAcceptedSourceIds);
  if (approvedDuplicates > 0) {
    throw new Error(
      `Reading approved inventory contains ${approvedDuplicates} duplicate source ID`,
    );
  }

  const liveDuplicates = duplicateCount(input.liveAcceptedSourceIds);
  if (liveDuplicates > 0) {
    throw new Error(
      `Reading live inventory contains ${liveDuplicates} duplicate source ID`,
    );
  }

  const approvedIds = new Set(input.approvedAcceptedSourceIds);
  const liveIds = new Set(input.liveAcceptedSourceIds);
  const added = [...liveIds].filter((sourceId) => !approvedIds.has(sourceId));
  const removed = [...approvedIds].filter((sourceId) => !liveIds.has(sourceId));

  if (added.length > 0 || removed.length > 0) {
    throw new Error(
      `Reading source scope changed: added ${added.length}, removed ${removed.length}`,
    );
  }

  if (input.approvedSha256 !== input.liveSha256) {
    throw new Error(
      `Reading approved inventory checksum ${input.approvedSha256.slice(
        0,
        CHECKSUM_PREFIX_LENGTH,
      )} does not match live checksum ${input.liveSha256.slice(
        0,
        CHECKSUM_PREFIX_LENGTH,
      )}`,
    );
  }
}
