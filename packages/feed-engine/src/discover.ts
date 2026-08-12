import { deduplicateContent, normalizeZhihuSearchItem } from "@zhihu-juejin/content-pipeline";
import type { DiscoveryResult, FeedManifest, NormalizedContent } from "@zhihu-juejin/contracts";

export interface ZhihuSearchPort {
  searchZhihu(options: { query: string; count?: number }): Promise<{
    items: Array<Parameters<typeof normalizeZhihuSearchItem>[0]>;
  }>;
}

export interface DiscoveryOptions {
  now?: () => number;
}

function includesNegativeKeyword(item: NormalizedContent, keywords: string[]): boolean {
  const searchableText = `${item.title}\n${item.excerpt}`.toLocaleLowerCase("zh-CN");
  return keywords.some((keyword) => searchableText.includes(keyword.toLocaleLowerCase("zh-CN")));
}

function isFreshEnough(item: NormalizedContent, cutoffTime: number): boolean {
  return item.updatedAt === undefined || new Date(item.updatedAt).getTime() >= cutoffTime;
}

export async function discoverFeedCandidates(
  searchClient: ZhihuSearchPort,
  manifest: FeedManifest,
  options: DiscoveryOptions = {},
): Promise<DiscoveryResult> {
  const normalized: NormalizedContent[] = [];
  const now = (options.now ?? Date.now)();

  for (const query of manifest.queries) {
    const result = await searchClient.searchZhihu({
      query,
      count: manifest.maxResultsPerQuery,
    });

    normalized.push(...result.items.map((item) => normalizeZhihuSearchItem(item, query)));
  }

  const deduplicated = deduplicateContent(normalized);
  const freshnessCutoff = now - manifest.freshnessDays * 24 * 60 * 60 * 1000;
  const candidates = deduplicated.filter(
    (item) =>
      isFreshEnough(item, freshnessCutoff) &&
      !includesNegativeKeyword(item, manifest.negativeKeywords),
  );

  return {
    feedId: manifest.id,
    manifestVersion: manifest.scoringVersion,
    fetchedAt: new Date(now).toISOString(),
    fetchedCount: normalized.length,
    uniqueCount: deduplicated.length,
    filteredCount: deduplicated.length - candidates.length,
    candidates,
  };
}
