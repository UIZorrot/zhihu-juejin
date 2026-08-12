import type { FeedManifest } from "@zhihu-juejin/contracts";

export const aiAgentDeepReviewsManifest = {
  id: "ai-agent-deep-reviews",
  displayName: "AI 模型与 Agent 深度评测",
  description: "关注第一手测试、成本拆解、能力边界和真实生产经验。",
  source: "zhihu",
  queries: [
    "Agent 深度评测",
    "AI Agent 实测 成本 局限",
    "智能体 benchmark 生产实践",
    "模型横向对比 失败案例",
  ],
  negativeKeywords: ["一键领取", "加微信", "限时免费", "私信领取"],
  freshnessDays: 730,
  maxResultsPerQuery: 10,
  scoringVersion: "discovery-v1",
} satisfies FeedManifest;
