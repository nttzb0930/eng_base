import type {
  ToeicWritingCanonicalBase,
  ToeicWritingCanonicalTask,
  ToeicWritingPartOneCanonicalTask,
  ToeicWritingPartTwoCanonicalTask,
  ToeicWritingValidationResult,
} from "./toeic-writing.types.js";

const SHA256_PATTERN = /^[a-f0-9]{64}$/u;
const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/u;
const ALLOWED_IMAGE_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

function isBlank(value: string): boolean {
  return value.trim().length === 0;
}

function validateNonBlankArray(
  values: string[],
  path: string,
  errors: string[]
): void {
  if (values.length === 0) {
    errors.push(`${path} must contain at least one value`);
    return;
  }

  if (values.some(isBlank)) {
    errors.push(`${path} must not contain blank values`);
  }
}

function validateBase(task: ToeicWritingCanonicalBase, errors: string[]): void {
  if (task.schemaVersion !== 1) {
    errors.push("schemaVersion must be 1");
  }
  if (isBlank(task.source)) {
    errors.push("source is required");
  }
  if (isBlank(task.sourceTaskId)) {
    errors.push("sourceTaskId is required");
  }
  if (!SHA256_PATTERN.test(task.sourceVersion)) {
    errors.push("sourceVersion must be a lowercase SHA-256");
  }
  if (!SHA256_PATTERN.test(task.contentSha256)) {
    errors.push("contentSha256 must be a lowercase SHA-256");
  }
  if (!ISO_DATE_PATTERN.test(task.retrievedAt)) {
    errors.push("retrievedAt must be a UTC ISO timestamp");
  }
  if (isBlank(task.licenseReference)) {
    errors.push("licenseReference is required");
  }
  if (!Number.isInteger(task.order) || task.order <= 0) {
    errors.push("order must be a positive integer");
  }
  if (isBlank(task.title)) {
    errors.push("title is required");
  }
  if (task.difficulty !== "EASY" && task.difficulty !== "MEDIUM") {
    errors.push("difficulty must be EASY or MEDIUM");
  }
  if (isBlank(task.instructionsEn)) {
    errors.push("instructionsEn is required");
  }
}

function isSafeStorageKey(storageKey: string): boolean {
  return (
    !isBlank(storageKey) &&
    !storageKey.includes("..") &&
    !storageKey.includes("://") &&
    !storageKey.startsWith("/") &&
    !storageKey.startsWith("\\") &&
    !/^[a-z]:[\\/]/iu.test(storageKey)
  );
}

function validatePartOne(
  task: ToeicWritingPartOneCanonicalTask,
  errors: string[]
): void {
  if (task.payload.requiredWords.length === 0) {
    errors.push("payload.requiredWords must contain at least one word");
  } else {
    const normalizedWords = task.payload.requiredWords.map(({ en }) =>
      en.trim().toLocaleLowerCase("en-US")
    );

    if (normalizedWords.some((word) => word.length === 0)) {
      errors.push("payload.requiredWords must not contain blank words");
    }
    if (new Set(normalizedWords).size !== normalizedWords.length) {
      errors.push("payload.requiredWords must not contain duplicate words");
    }
  }

  if (task.media === null) {
    errors.push("media is required for Part 1");
  } else {
    if (!isSafeStorageKey(task.media.storageKey)) {
      errors.push("media.storageKey must be repository-relative and safe");
    }
    if (!SHA256_PATTERN.test(task.media.sha256)) {
      errors.push("media.sha256 must be a lowercase SHA-256");
    }
    if (!Number.isInteger(task.media.bytes) || task.media.bytes <= 0) {
      errors.push("media.bytes must be a positive integer");
    }
    if (!ALLOWED_IMAGE_MIME_TYPES.has(task.media.mimeType)) {
      errors.push("media.mimeType is not an allowed image type");
    }
  }

  validateNonBlankArray(task.payload.samplesEn, "payload.samplesEn", errors);
}

function validateRequirements(
  task: ToeicWritingPartTwoCanonicalTask,
  errors: string[]
): void {
  const { requirements } = task.payload;
  if (requirements.length === 0) {
    errors.push("payload.requirements must contain at least one requirement");
    return;
  }

  requirements.forEach((requirement, index) => {
    if (requirement.order !== index + 1) {
      errors.push("payload.requirements must use consecutive order values");
    }
    if (isBlank(requirement.textEn)) {
      errors.push("payload.requirements must not contain blank English text");
    }
  });
}

function validatePartTwo(
  task: ToeicWritingPartTwoCanonicalTask,
  errors: string[]
): void {
  if (task.media !== null) {
    errors.push("media must be null for Part 2");
  }
  if (isBlank(task.payload.promptEn)) {
    errors.push("payload.promptEn is required");
  }

  validateRequirements(task, errors);
  validateNonBlankArray(
    task.payload.chunksLevel1,
    "payload.chunksLevel1",
    errors
  );
  validateNonBlankArray(
    task.payload.chunksLevel2,
    "payload.chunksLevel2",
    errors
  );

  if (isBlank(task.payload.sampleEn)) {
    errors.push("payload.sampleEn is required");
  }

  const levelTwoChunks = task.payload.chunksLevel2
    .join("\n")
    .toLocaleLowerCase("en-US");
  for (const reference of task.payload.gapReferences) {
    const normalizedReference = reference.trim().toLocaleLowerCase("en-US");
    if (
      normalizedReference.length === 0 ||
      !levelTwoChunks.includes(normalizedReference)
    ) {
      errors.push(`payload gap reference is orphaned: ${reference}`);
    }
  }
}

export function validateToeicWritingTask(
  task: ToeicWritingCanonicalTask
): ToeicWritingValidationResult {
  const errors: string[] = [];

  validateBase(task, errors);
  if (task.part === 1) {
    validatePartOne(task, errors);
  } else {
    validatePartTwo(task, errors);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
