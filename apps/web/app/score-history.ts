export const SCORE_HISTORY_KEY = "zhihu-juejin.score-history";

export const LEGACY_SCORE_HISTORY_KEYS = [
  "zhihu-juejin.score-history.v8",
  "zhihu-juejin.score-history.v7",
  "zhihu-juejin.score-history.v6",
  "zhihu-juejin.score-history.v5",
  "zhihu-juejin.score-history.v4",
  "zhihu-juejin.score-history.v3",
  "zhihu-juejin.score-history.v2",
  "zhihu-juejin.score-history.v1",
] as const;

export interface HistoryStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export interface StoredScoreHistoryEntry {
  savedAt: string;
  result: {
    article: {
      title: string;
      canonicalUrl: string;
    };
    score: {
      finalScore: number;
    };
  };
}

export function isStoredScoreHistoryEntry(value: unknown): value is StoredScoreHistoryEntry {
  if (!value || typeof value !== "object") {
    return false;
  }
  const candidate = value as Partial<StoredScoreHistoryEntry>;
  return (
    typeof candidate.savedAt === "string" &&
    typeof candidate.result?.article?.title === "string" &&
    typeof candidate.result?.article?.canonicalUrl === "string" &&
    typeof candidate.result?.score?.finalScore === "number"
  );
}

export function readScoreHistory(storage: HistoryStorage): StoredScoreHistoryEntry[] {
  const entries: StoredScoreHistoryEntry[] = [];
  for (const key of [SCORE_HISTORY_KEY, ...LEGACY_SCORE_HISTORY_KEYS]) {
    const saved = storage.getItem(key);
    if (!saved) {
      continue;
    }
    try {
      const decoded: unknown = JSON.parse(saved);
      if (Array.isArray(decoded)) {
        entries.push(...decoded.filter(isStoredScoreHistoryEntry));
      }
    } catch {
      // A broken historical payload must not prevent recovery from another key.
    }
  }

  return [...entries]
    .sort((left, right) => Date.parse(right.savedAt) - Date.parse(left.savedAt))
    .filter(
      (entry, index, all) =>
        all.findIndex(
          (candidate) =>
            candidate.result.article.canonicalUrl === entry.result.article.canonicalUrl,
        ) === index,
    )
    .slice(0, 10);
}

export function writeScoreHistory(
  storage: HistoryStorage,
  entries: StoredScoreHistoryEntry[],
): void {
  storage.setItem(SCORE_HISTORY_KEY, JSON.stringify(entries.slice(0, 10)));
}
