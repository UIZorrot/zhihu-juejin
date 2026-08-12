import { describe, expect, test } from "bun:test";
import type { ZhihuSearchItem } from "@zhihu-juejin/zhihu-client";
import { discoverTaxonomyCandidates } from "./discover-taxonomy";

const item: ZhihuSearchItem = {
  Title: "从 Agent 评测到生产实践",
  ContentType: "Article",
  ContentID: "taxonomy-1",
  ContentText: "包含评测数据与失败案例",
  Url: "https://zhuanlan.zhihu.com/p/taxonomy-1",
  CommentCount: 2,
  VoteUpCount: 3,
  AuthorName: "作者",
  AuthorAvatar: "https://pic.example.com/avatar.jpg",
  EditTime: 1_750_000_000,
};

describe("discoverTaxonomyCandidates", () => {
  test("preserves topic provenance when queries overlap", async () => {
    const result = await discoverTaxonomyCandidates(
      { searchZhihu: async () => ({ items: [item] }) },
      [
        {
          query: "Agent 评测",
          topicId: "agent-evaluation",
          topicPath: ["人工智能", "AI Agent", "Agent 评测"],
          level: "topic",
          priority: 5,
          cadence: "daily",
          intent: "discovery",
          freshnessIntent: "recent",
          minimumSourceEditTime: "2025-01-01T00:00:00.000Z",
        },
        {
          query: "Agent 生产实践",
          topicId: "agent-production",
          topicPath: ["人工智能", "AI Agent", "Agent 生产实践"],
          level: "topic",
          priority: 5,
          cadence: "daily",
          intent: "depth",
          freshnessIntent: "historical",
        },
      ],
      { now: () => 1_750_000_000_000 },
    );

    expect(result.fetchedCount).toBe(2);
    expect(result.freshnessFilteredCount).toBe(0);
    expect(result.uniqueCount).toBe(1);
    expect(result.candidates[0]?.candidateTopicIds).toEqual([
      "agent-evaluation",
      "agent-production",
    ]);
  });

  test("drops stale results returned by a recent query", async () => {
    const result = await discoverTaxonomyCandidates(
      { searchZhihu: async () => ({ items: [{ ...item, EditTime: 1_600_000_000 }] }) },
      [
        {
          query: "Agent 2026 最新",
          topicId: "agent-production",
          topicPath: ["人工智能", "AI Agent", "Agent 生产实践"],
          level: "topic",
          priority: 5,
          cadence: "daily",
          intent: "discovery",
          freshnessIntent: "recent",
          minimumSourceEditTime: "2026-01-01T00:00:00.000Z",
        },
      ],
    );

    expect(result.fetchedCount).toBe(1);
    expect(result.freshnessFilteredCount).toBe(1);
    expect(result.uniqueCount).toBe(0);
  });
});
