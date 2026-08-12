import { describe, expect, test } from "bun:test";
import { looksLikeTargetContent } from "./baseline-source-filter";

describe("baseline source leak protection", () => {
  const target = "如何评价 Anthropic 宣布将黎曼猜想的已知下界从 41.6% 提高到了 67.2%？";

  test("rejects exact-title reposts and decorated mirrors", () => {
    expect(looksLikeTargetContent(target, target)).toBe(true);
    expect(looksLikeTargetContent(`转载｜${target} - 某资讯站`, target)).toBe(true);
    expect(looksLikeTargetContent(`${target} 的回答`, target)).toBe(true);
  });

  test("keeps independently titled source material", () => {
    expect(
      looksLikeTargetContent(
        "New lower bounds for zeros of the Riemann zeta function on the critical line",
        target,
      ),
    ).toBe(false);
    expect(looksLikeTargetContent("Bombieri 2000 年论文与临界线零点研究", target)).toBe(false);
  });
});
