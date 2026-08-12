import { describe, expect, test } from "bun:test";
import type { FeedManifest } from "@zhihu-juejin/contracts";
import type { ZhihuSearchItem } from "@zhihu-juejin/zhihu-client";
import { discoverFeedCandidates } from "./discover";

function createItem(id: string, title: string): ZhihuSearchItem {
  return {
    Title: title,
    ContentType: "Article",
    ContentID: id,
    ContentText: "包含成本、限制和实测数据",
    Url: `https://zhuanlan.zhihu.com/p/${id}?utm_source=openapi`,
    CommentCount: 0,
    VoteUpCount: 1,
    AuthorName: "作者",
    AuthorAvatar: "https://pic.example.com/avatar.jpg",
    EditTime: 1_750_000_000,
  };
}

const manifest: FeedManifest = {
  id: "test-feed",
  displayName: "测试 Feed",
  description: "测试发现流水线",
  source: "zhihu",
  queries: ["Agent 实测", "Agent 评测"],
  negativeKeywords: ["加微信"],
  freshnessDays: 365,
  maxResultsPerQuery: 10,
  scoringVersion: "test-v1",
};

describe("discoverFeedCandidates", () => {
  test("deduplicates query fan-out and filters explicit marketing terms", async () => {
    const shared = createItem("1", "生产级 Agent 实测");
    const marketing = createItem("2", "加微信领取 Agent 资料");
    const searchClient = {
      searchZhihu: async ({ query }: { query: string }) => ({
        items: query === "Agent 实测" ? [shared, marketing] : [shared],
      }),
    };

    const result = await discoverFeedCandidates(searchClient, manifest, {
      now: () => 1_750_000_000_000,
    });

    expect(result.fetchedCount).toBe(3);
    expect(result.uniqueCount).toBe(2);
    expect(result.filteredCount).toBe(1);
    expect(result.candidates).toHaveLength(1);
    expect(result.candidates[0]?.discoveredBy).toEqual(["Agent 实测", "Agent 评测"]);
  });
});
