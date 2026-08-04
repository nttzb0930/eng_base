export type ToeicDictationAccessLevel = "free" | "pro";

export type ToeicDictationSetRow = {
  sourceSetId: string;
  name: string;
  folderPath: string | null;
  part: 1 | 2 | 3 | 4;
  accessLevel: ToeicDictationAccessLevel;
  order: number;
  collectionName: string;
  chapterName: string | null;
  subtitle: string | null;
  isHidden: boolean;
};

export type ToeicDictationItemRow = {
  sourceItemId: string;
  sourceSetId: string;
  order: number;
  groupId: string | null;
  groupOrder: number | null;
  audioUrl: string | null;
  transcript: string | null;
  translationVi: string | null;
  durationSeconds: number | null;
  isHidden: boolean;
};

export type ToeicDictationMediaInspection = {
  bytes: number | null;
  contentType: string | null;
};

export type ToeicDictationSource = {
  listSets(collectionName: string): Promise<ToeicDictationSetRow[]>;
  listItems(sourceSetId: string): Promise<ToeicDictationItemRow[]>;
  inspectMedia(url: string): Promise<ToeicDictationMediaInspection>;
  downloadMedia(
    url: string,
    offset: number
  ): Promise<{
    status: number;
    bytes: Uint8Array;
    contentType: string | null;
  }>;
};

export type ToeicDictationInventorySource = Pick<
  ToeicDictationSource,
  "listSets" | "listItems" | "inspectMedia"
>;

export type ToeicDictationCanonicalItem = ToeicDictationItemRow & {
  media: {
    url: string;
    bytes: number | null;
    contentType: string | null;
  };
};

export type ToeicDictationCanonicalSet = ToeicDictationSetRow & {
  items: ToeicDictationCanonicalItem[];
};

export type ToeicDictationInventory = {
  schemaVersion: 1;
  source: "dautoeic";
  collectionName: string;
  observedAt: string;
  selectedSetCount: number;
  itemCount: number;
  audioCount: number;
  knownMediaBytes: number;
  unknownMediaSizeCount: number;
  selectedSets: ToeicDictationCanonicalSet[];
  media: Array<{
    url: string;
    bytes: number | null;
    contentType: string | null;
  }>;
  inventorySha256: string;
  storageKey: string;
};

export type ToeicDictationStorage = {
  readInventory(sha256: string): Promise<ToeicDictationInventory>;
  writeInventory(value: ToeicDictationInventory): Promise<string>;
  resolveMediaPath(
    packageVersion: string,
    mediaId: string,
    contentType: string
  ): string;
  ensureMediaDirectory(path: string): Promise<void>;
  downloadMedia(input: {
    packageVersion: string;
    mediaId: string;
    contentType: string;
    expectedBytes: number | null;
    expectedSha256?: string;
    request(offset: number): Promise<{
      status: number;
      bytes: Uint8Array;
      contentType: string | null;
    }>;
  }): Promise<{
    absolutePath: string;
    storagePath: string;
    sha256: string;
    bytes: number;
    contentType: string;
    reused: boolean;
  }>;
  writePackageFile(
    packageVersion: string,
    name: string,
    value: unknown
  ): Promise<void>;
  readPackageFile(packageVersion: string, name: string): Promise<unknown>;
};

export type ToeicDictationDownloadSummary = {
  completed: string[];
  resumed: string[];
  failed: Array<{ mediaUrl: string; category: string }>;
  downloadedMediaCount: number;
};
