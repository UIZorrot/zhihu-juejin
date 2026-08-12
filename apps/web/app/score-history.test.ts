import { describe, expect, test } from "bun:test";
import {
  LEGACY_SCORE_HISTORY_KEYS,
  readScoreHistory,
  SCORE_HISTORY_KEY,
  type StoredScoreHistoryEntry,
  writeScoreHistory,
} from "./score-history";

class MemoryStorage {
  readonly values = new Map<string, string>();

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }
}

function entry(url: string, savedAt: string): StoredScoreHistoryEntry {
  return {
    savedAt,
    result: {
      article: { title: `文章 ${url}`, canonicalUrl: url },
      score: { finalScore: 7 },
    },
  };
}

describe("score history persistence", () => {
  test("recovers versioned history without deleting it", () => {
    const storage = new MemoryStorage();
    const legacy = entry("https://www.zhihu.com/answer/1", "2026-08-12T10:00:00.000Z");
    storage.setItem(LEGACY_SCORE_HISTORY_KEYS[0], JSON.stringify([legacy]));

    expect(readScoreHistory(storage)).toEqual([legacy]);
    expect(storage.getItem(LEGACY_SCORE_HISTORY_KEYS[0])).toBe(JSON.stringify([legacy]));
  });

  test("keeps the newest result per link across storage versions", () => {
    const storage = new MemoryStorage();
    const older = entry("https://www.zhihu.com/answer/1", "2026-08-12T10:00:00.000Z");
    const newer = entry("https://www.zhihu.com/answer/1", "2026-08-12T11:00:00.000Z");
    storage.setItem(LEGACY_SCORE_HISTORY_KEYS[0], JSON.stringify([older]));
    writeScoreHistory(storage, [newer]);

    expect(readScoreHistory(storage)).toEqual([newer]);
  });

  test("a malformed payload cannot erase recoverable history", () => {
    const storage = new MemoryStorage();
    const legacy = entry("https://www.zhihu.com/answer/2", "2026-08-12T10:00:00.000Z");
    storage.setItem(SCORE_HISTORY_KEY, "not-json");
    storage.setItem(LEGACY_SCORE_HISTORY_KEYS[1], JSON.stringify([legacy]));

    expect(readScoreHistory(storage)).toEqual([legacy]);
  });
});
