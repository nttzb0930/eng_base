import type { ToeicDictationInventory } from "./toeic-dictation.types";

export type ToeicDictationPackageValidation = {
  valid: boolean;
  errors: string[];
};

export function validateToeicDictationPackage(
  value: ToeicDictationInventory,
  options: { expectedSetCount?: number } = {}
): ToeicDictationPackageValidation {
  const errors: string[] = [];
  if (value.schemaVersion !== 1) errors.push("unsupported schema version");
  if (value.source !== "dautoeic") errors.push("source must be dautoeic");
  if (value.collectionName !== "Đề 2026") errors.push("collection must be Đề 2026");
  if (options.expectedSetCount !== undefined && value.selectedSetCount !== options.expectedSetCount) {
    errors.push(`expected ${options.expectedSetCount} sets, received ${value.selectedSetCount}`);
  }
  const setIds = new Set<string>();
  const itemIds = new Set<string>();
  const mediaByUrl = new Map(value.media.map((media) => [media.url, media]));
  for (const set of value.selectedSets) {
    if (setIds.has(set.sourceSetId)) errors.push(`duplicate source set ${set.sourceSetId}`);
    setIds.add(set.sourceSetId);
    if (set.accessLevel !== "free") errors.push(`set ${set.sourceSetId} has invalid access level`);
    if (set.isHidden) errors.push(`set ${set.sourceSetId} is hidden`);
    if (set.collectionName !== "Đề 2026") errors.push(`set ${set.sourceSetId} is outside 2026`);
    const orders = new Set<number>();
    for (const item of set.items) {
      if (itemIds.has(item.sourceItemId)) errors.push(`duplicate source item ${item.sourceItemId}`);
      itemIds.add(item.sourceItemId);
      if (orders.has(item.order)) errors.push(`duplicate item order in set ${set.sourceSetId}`);
      orders.add(item.order);
      if (item.isHidden) errors.push(`item ${item.sourceItemId} is hidden`);
      if (!item.transcript?.trim()) errors.push(`item ${item.sourceItemId} has missing transcript`);
      if (!item.audioUrl?.trim()) errors.push(`item ${item.sourceItemId} has missing audio`);
      const media = item.audioUrl ? mediaByUrl.get(item.audioUrl) : undefined;
      if (!media) errors.push(`item ${item.sourceItemId} has no media manifest`);
      else {
        if (!media.bytes || media.bytes <= 0) errors.push(`item ${item.sourceItemId} has invalid media bytes`);
        if (!media.contentType?.startsWith("audio/")) errors.push(`item ${item.sourceItemId} has invalid media type`);
      }
    }
  }
  if (value.itemCount !== itemIds.size) errors.push("item count does not match content");
  if (value.audioCount !== mediaByUrl.size) errors.push("audio count does not match media manifest");
  if (value.unknownMediaSizeCount !== 0) errors.push("media sizes are unknown");
  return { valid: errors.length === 0, errors };
}
