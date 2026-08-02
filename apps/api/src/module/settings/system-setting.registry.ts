import type { SystemSettings } from "@repo/shared";

export type SystemSettingField = keyof SystemSettings;
export type SystemSettingStorageKey =
  | "MAX_HEARTS"
  | "PRACTICE_WORDS_PER_LESSON"
  | "WEAK_WORDS_LIMIT"
  | "DAILY_REVIEW_RELAXED_LIMIT"
  | "DAILY_REVIEW_STANDARD_LIMIT"
  | "DAILY_REVIEW_ACCELERATED_LIMIT"
  | "DAILY_REVIEW_INTENSIVE_LIMIT"
  | "REGISTRATION_ENABLED";

type SystemSettingDefinition<Value extends number | boolean> = {
  defaultValue: Value;
  key: SystemSettingStorageKey;
  parse(raw: string): Value | undefined;
  serialize(value: Value): string;
};

function integerSetting(
  key: SystemSettingStorageKey,
  defaultValue: number,
  minimum: number,
  maximum: number,
): SystemSettingDefinition<number> {
  return {
    defaultValue,
    key,
    parse(raw) {
      const value = Number(raw);
      return Number.isInteger(value) && value >= minimum && value <= maximum
        ? value
        : undefined;
    },
    serialize: String,
  };
}

const booleanSetting = (
  key: SystemSettingStorageKey,
  defaultValue: boolean,
): SystemSettingDefinition<boolean> => ({
  defaultValue,
  key,
  parse(raw) {
    if (raw === "true") return true;
    if (raw === "false") return false;
    return undefined;
  },
  serialize: String,
});

const systemSettingRegistry = {
  maxHearts: integerSetting("MAX_HEARTS", 5, 1, 99),
  practiceWordsPerLesson: integerSetting(
    "PRACTICE_WORDS_PER_LESSON",
    15,
    5,
    50,
  ),
  weakWordsLimit: integerSetting("WEAK_WORDS_LIMIT", 20, 5, 100),
  dailyReviewRelaxedLimit: integerSetting(
    "DAILY_REVIEW_RELAXED_LIMIT",
    5,
    1,
    50,
  ),
  dailyReviewStandardLimit: integerSetting(
    "DAILY_REVIEW_STANDARD_LIMIT",
    15,
    1,
    100,
  ),
  dailyReviewAcceleratedLimit: integerSetting(
    "DAILY_REVIEW_ACCELERATED_LIMIT",
    30,
    1,
    150,
  ),
  dailyReviewIntensiveLimit: integerSetting(
    "DAILY_REVIEW_INTENSIVE_LIMIT",
    50,
    1,
    200,
  ),
  registrationEnabled: booleanSetting("REGISTRATION_ENABLED", true),
} satisfies {
  [Field in SystemSettingField]: SystemSettingDefinition<SystemSettings[Field]>;
};

export const SYSTEM_SETTING_FIELDS = [
  "maxHearts",
  "practiceWordsPerLesson",
  "weakWordsLimit",
  "dailyReviewRelaxedLimit",
  "dailyReviewStandardLimit",
  "dailyReviewAcceleratedLimit",
  "dailyReviewIntensiveLimit",
  "registrationEnabled",
] as const satisfies readonly SystemSettingField[];

export const SYSTEM_SETTING_STORAGE_KEYS = SYSTEM_SETTING_FIELDS.map(
  (field) => systemSettingRegistry[field].key,
);

export function getSystemSettingDefinition<Field extends SystemSettingField>(
  field: Field,
): SystemSettingDefinition<SystemSettings[Field]> {
  return systemSettingRegistry[field] as SystemSettingDefinition<
    SystemSettings[Field]
  >;
}

export function getSystemSettingFieldByStorageKey(
  key: string,
): SystemSettingField | undefined {
  return SYSTEM_SETTING_FIELDS.find(
    (field) => systemSettingRegistry[field].key === key,
  );
}

export function parseSystemSettingInput<Field extends SystemSettingField>(
  field: Field,
  raw: string,
): SystemSettings[Field] | undefined {
  return getSystemSettingDefinition(field).parse(raw);
}

export function getEffectiveSystemSetting<Field extends SystemSettingField>(
  field: Field,
  raw: string | null | undefined,
): SystemSettings[Field] {
  const definition = getSystemSettingDefinition(field);
  return (raw === null || raw === undefined ? undefined : definition.parse(raw))
    ?? definition.defaultValue;
}

export function serializeSystemSetting<Field extends SystemSettingField>(
  field: Field,
  value: SystemSettings[Field],
): string {
  return getSystemSettingDefinition(field).serialize(value);
}
