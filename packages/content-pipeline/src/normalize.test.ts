import { describe, expect, test } from "bun:test";
import type { ZhihuSearchItem } from "@zhihu-juejin/zhihu-client";
import { deduplicateContent } from "./deduplicate";
import { canonicalizeUrl, cleanSearchText, normalizeZhihuSearchItem } from "./normalize";

const sourceItem: ZhihuSearchItem = {
  Title: "<em>Agent</em> 深度评测",
  ContentType: "Article",
  ContentID: "123",
  ContentText: "第一手&nbsp;测试 <em>结果</em>",
  Url: "https://zhuanlan.zhihu.com/p/123?utm_source=openapi&utm_medium=test",
  CommentCount: 3,
  VoteUpCount: 1,
  AuthorName: "测试作者",
  AuthorAvatar: "https://pic.example.com/avatar.jpg",
  EditTime: 1_750_000_000,
  AuthorityLevel: "2",
};

describe("content normalization", () => {
  test("removes highlights, HTML entities, and tracking parameters", () => {
    expect(cleanSearchText("<em>Agent</em>&nbsp;  实测")).toBe("Agent 实测");
    expect(canonicalizeUrl(sourceItem.Url)).toBe("https://zhuanlan.zhihu.com/p/123");
  });

  test("creates a stable normalized identity", () => {
    const content = normalizeZhihuSearchItem(sourceItem, "Agent 实测");

    expect(content.id).toBe("zhihu:article:123");
    expect(content.author.provisionalIdentityKey).toHaveLength(64);
    expect(content.metrics).toEqual({ likes: 1, comments: 3 });
    expect(content.authorityLevel).toBe(2);
  });

  test("merges discovery provenance while deduplicating", () => {
    const first = normalizeZhihuSearchItem(sourceItem, "Agent 实测");
    const second = normalizeZhihuSearchItem(sourceItem, "Agent 深度评测");

    const result = deduplicateContent([first, second]);

    expect(result).toHaveLength(1);
    expect(result[0]?.discoveredBy).toEqual(["Agent 实测", "Agent 深度评测"]);
  });
});
