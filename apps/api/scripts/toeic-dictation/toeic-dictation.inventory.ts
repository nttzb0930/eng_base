import { createHash } from "node:crypto";

import type {
  ToeicDictationCanonicalSet,
  ToeicDictationInventory,
  ToeicDictationInventorySource,
  ToeicDictationItemRow,
} from "./toeic-dictation.types";

function stableJson(value: unknown) {
  return JSON.stringify(value);
}

function sha256(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

export async function buildToeicDictationInventory(input: {
  source: ToeicDictationInventorySource;
  collectionName: string;
  observedAt: string;
  mediaConcurrency?: number;
}): Promise<ToeicDictationInventory> {
  const allSets = await input.source.listSets(input.collectionName);
  const selectedSets = allSets
    .filter(
      (set) =>
        set.collectionName === input.collectionName &&
        set.accessLevel === "free" &&
        !set.isHidden
    )
    .sort(
      (left, right) =>
        left.order - right.order || left.part - right.part || left.sourceSetId.localeCompare(right.sourceSetId)
    );

  const canonicalSets: ToeicDictationCanonicalSet[] = [];
  const mediaByUrl = new Map<
    string,
    { url: string; bytes: number | null; contentType: string | null }
  >();
  type PendingItem = { item: ToeicDictationItemRow; audioUrl: string };
  const pendingBySet = new Map<string, PendingItem[]>();
  const pendingUrls = new Set<string>();

  for (const set of selectedSets) {
    const sourceItems = (await input.source.listItems(set.sourceSetId))
      .filter((item) => item.sourceSetId === set.sourceSetId && !item.isHidden)
      .sort(
        (left, right) =>
          left.order - right.order || left.sourceItemId.localeCompare(right.sourceItemId)
      );
    const seenItems = new Set<string>();
    const pendingItems: PendingItem[] = [];
    for (const item of sourceItems) {
      if (seenItems.has(item.sourceItemId)) {
        throw new Error(`duplicate source item ${item.sourceItemId}`);
      }
      seenItems.add(item.sourceItemId);
      if (!item.audioUrl?.trim()) {
        throw new Error(`item ${item.sourceItemId} has missing audio`);
      }
      if (!item.transcript?.trim()) {
        throw new Error(`item ${item.sourceItemId} has missing transcript`);
      }
      pendingItems.push({ item, audioUrl: item.audioUrl });
      pendingUrls.add(item.audioUrl);
    }
    pendingBySet.set(set.sourceSetId, pendingItems);
  }

  const urls = [...pendingUrls];
  const concurrency = Math.max(1, Math.floor(input.mediaConcurrency ?? 8));
  let cursor = 0;
  async function inspectNext(): Promise<void> {
    while (cursor < urls.length) {
      const index = cursor;
      cursor += 1;
      const url = urls[index];
      if (!url) return;
      mediaByUrl.set(url, {
        url,
        ...(await input.source.inspectMedia(url)),
      });
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(concurrency, urls.length) }, () =>
      inspectNext()
    )
  );

  for (const set of selectedSets) {
    const items = (pendingBySet.get(set.sourceSetId) ?? []).map(
      ({ item, audioUrl }) => {
        const media = mediaByUrl.get(audioUrl);
        if (!media) throw new Error(`missing media inspection for ${audioUrl}`);
        return { ...item, media };
      }
    );
    canonicalSets.push({ ...set, items });
  }

  const media = [...mediaByUrl.values()].sort((left, right) =>
    left.url.localeCompare(right.url)
  );
  const canonical = {
    schemaVersion: 1 as const,
    source: "dautoeic" as const,
    collectionName: input.collectionName,
    selectedSets: canonicalSets,
    media,
  };
  const inventorySha256 = sha256(stableJson(canonical));
  const knownMediaBytes = media.reduce(
    (total, value) => total + (value.bytes ?? 0),
    0
  );

  return {
    ...canonical,
    observedAt: input.observedAt,
    selectedSetCount: canonicalSets.length,
    itemCount: canonicalSets.reduce((total, set) => total + set.items.length, 0),
    audioCount: media.length,
    knownMediaBytes,
    unknownMediaSizeCount: media.filter((value) => value.bytes === null).length,
    inventorySha256,
    storageKey: `inventories/toeic-dictation/2026/${inventorySha256}.json`,
  };
}
