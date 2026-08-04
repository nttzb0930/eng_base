import type { ToeicListeningStorage } from "./toeic-listening-practice.types.js";

export type ToeicListeningPackageIdentity = {
  sourceTestId: string;
  sourceVersion: string;
};

export type ToeicListeningPackageSelection = {
  physicalPackageCount: number;
  selected: ToeicListeningPackageIdentity[];
  superseded: ToeicListeningPackageIdentity[];
};

type AcquiredPackage = ToeicListeningPackageIdentity & {
  acquiredAtMs: number;
};

function comparePackageIdentity(
  left: ToeicListeningPackageIdentity,
  right: ToeicListeningPackageIdentity
) {
  return `${left.sourceTestId}/${left.sourceVersion}`.localeCompare(
    `${right.sourceTestId}/${right.sourceVersion}`
  );
}

export async function selectLatestToeicListeningPackages(
  storage: ToeicListeningStorage
): Promise<ToeicListeningPackageSelection> {
  const packages = await storage.listCompletePackages();
  const acquired: AcquiredPackage[] = [];

  for (const item of packages) {
    const manifest = (await storage.readPackageFile(
      item.sourceTestId,
      item.sourceVersion,
      "manifest.json"
    )) as Record<string, unknown>;
    const acquiredAtMs =
      typeof manifest.acquiredAt === "string"
        ? Date.parse(manifest.acquiredAt)
        : Number.NaN;
    if (!Number.isFinite(acquiredAtMs)) {
      throw new Error(
        `Package ${item.sourceTestId}/${item.sourceVersion} has invalid acquiredAt`
      );
    }
    acquired.push({ ...item, acquiredAtMs });
  }

  const selectedByTest = new Map<string, AcquiredPackage>();
  for (const candidate of acquired) {
    const current = selectedByTest.get(candidate.sourceTestId);
    if (
      current === undefined ||
      candidate.acquiredAtMs > current.acquiredAtMs ||
      (candidate.acquiredAtMs === current.acquiredAtMs &&
        candidate.sourceVersion.localeCompare(current.sourceVersion) > 0)
    ) {
      selectedByTest.set(candidate.sourceTestId, candidate);
    }
  }

  const selected = [...selectedByTest.values()]
    .map(({ sourceTestId, sourceVersion }) => ({
      sourceTestId,
      sourceVersion,
    }))
    .sort(comparePackageIdentity);
  const selectedKeys = new Set(
    selected.map((item) => `${item.sourceTestId}/${item.sourceVersion}`)
  );
  const superseded = packages
    .filter(
      (item) => !selectedKeys.has(`${item.sourceTestId}/${item.sourceVersion}`)
    )
    .sort(comparePackageIdentity);

  return {
    physicalPackageCount: packages.length,
    selected,
    superseded,
  };
}
