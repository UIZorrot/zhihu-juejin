import { describe, expect, test } from "bun:test";
import { knowledgeTaxonomy } from "./catalog";
import { getDomainFreshnessPolicy } from "./freshness";
import { buildTaxonomyQueryPlan } from "./planner";

describe("knowledge taxonomy", () => {
  test("covers every requested major clue in a three-level tree", () => {
    const serialized = JSON.stringify(knowledgeTaxonomy).toLocaleLowerCase("zh-CN");
    for (const clue of [
      "ai agent",
      "开源项目",
      "vibe coding",
      "ue5",
      "blender",
      "houdini",
      "chatgpt",
      "deepseek",
      "kimi k3",
      "geo",
      "美股",
      "dram",
      "摄影",
      "电子乐",
      "材料科学",
      "spacex",
      "网络安全",
      "独立游戏",
      "电竞",
    ]) {
      expect(serialized).toContain(clue.toLocaleLowerCase("zh-CN"));
    }
  });

  test("round-robins domains instead of allowing AI to consume the entire query budget", () => {
    const plan = buildTaxonomyQueryPlan(knowledgeTaxonomy, {
      maxQueries: 22,
      rotationSeed: 3,
      now: () => Date.UTC(2026, 7, 10),
    });
    const domains = new Set(plan.map((item) => item.topicPath[0]));

    expect(plan).toHaveLength(22);
    expect(domains.size).toBe(knowledgeTaxonomy.length);
  });

  test("allocates more recent queries to fast-moving domains", () => {
    const plan = buildTaxonomyQueryPlan(knowledgeTaxonomy, {
      maxQueries: 120,
      now: () => Date.UTC(2026, 7, 10),
    });
    const count = (domain: string, freshnessIntent: "recent" | "historical") =>
      plan.filter(
        (item) => item.topicPath[0] === domain && item.freshnessIntent === freshnessIntent,
      ).length;

    expect(count("人工智能", "recent")).toBe(9);
    expect(count("人工智能", "historical")).toBe(1);
    expect(count("社会科学与人文", "recent")).toBe(7);
    expect(count("社会科学与人文", "historical")).toBe(3);
  });

  test("uses a 30-day recent window for the fastest-moving domains", () => {
    for (const domainId of [
      "artificial-intelligence",
      "software-open-source",
      "product-growth-media",
      "finance-investing",
      "hardware-semiconductors",
    ]) {
      expect(getDomainFreshnessPolicy(domainId).recentWindowDays).toBe(30);
    }
  });

  test("uses the requested domain names", () => {
    const labels = knowledgeTaxonomy.map((domain) => domain.label);
    expect(labels).toContain("基础科学与数学");
    expect(labels).toContain("应用科学");
    expect(labels).not.toContain("科学与数学");
    expect(labels).not.toContain("能源、电力与航天");
    expect(labels).toContain("游戏、生活与娱乐");
  });
});
