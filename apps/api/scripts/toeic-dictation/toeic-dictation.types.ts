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
