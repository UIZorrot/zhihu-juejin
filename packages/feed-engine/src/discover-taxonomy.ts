import { deduplicateContent, normalizeZhihuSearchItem } from "@zhihu-juejin/content-pipeline";
import type { NormalizedContent } from "@zhihu-juejin/contracts";
import type { PlannedQuery } from "@zhihu-juejin/taxonomy";
import type { ZhihuSearchPort } from "./discover";

export interface TaxonomyDiscoveryResult {
  runType: "taxonomy";
  fetchedAt: string;
  queryCount: number;
  fetchedCount: number;
  freshnessFilteredCount: number;
  uniqueCount: number;
  candidates: NormalizedContent[];
}

export async function discoverTaxonomyCandidates(
  searchClient: ZhihuSearchPort,
  plan: readonly PlannedQuery[],
  options: { now?: () => number; resultsPerQuery?: number } = {},
): Promise<TaxonomyDiscoveryResult> {
  const normalized: NormalizedContent[] = [];
  let fetchedCount = 0;
  let freshnessFilteredCount = 0;
  const resultsPerQuery = options.resultsPerQuery ?? 10;

  for (const plannedQuery of plan) {
    const result = await searchClient.searchZhihu({
      query: plannedQuery.query,
      count: resultsPerQuery,
    });
    fetchedCount += result.items.length;
    const eligibleItems = result.items.filter((item) => {
      if (plannedQuery.minimumSourceEditTime === undefined) {
        return true;
      }
      const eligible =
        item.EditTime > 0 &&
        item.EditTime * 1_000 >= new Date(plannedQuery.minimumSourceEditTime).getTime();
      if (!eligible) {
        freshnessFilteredCount += 1;
      }
      return eligible;
    });
    normalized.push(
      ...eligibleItems.map((item) =>
        normalizeZhihuSearchItem(item, plannedQuery.query, [plannedQuery.topicId]),
      ),
    );
  }

  const candidates = deduplicateContent(normalized);
  return {
    runType: "taxonomy",
    fetchedAt: new Date((options.now ?? Date.now)()).toISOString(),
    queryCount: plan.length,
    fetchedCount,
    freshnessFilteredCount,
    uniqueCount: candidates.length,
    candidates,
  };
}
