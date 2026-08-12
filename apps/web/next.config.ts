import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: [
    "@zhihu-juejin/audit-engine",
    "@zhihu-juejin/content-pipeline",
    "@zhihu-juejin/contracts",
    "@zhihu-juejin/feed-engine",
    "@zhihu-juejin/llm-evaluator",
    "@zhihu-juejin/quality-pipeline",
    "@zhihu-juejin/recommendation-engine",
    "@zhihu-juejin/taxonomy",
    "@zhihu-juejin/zhihu-client",
  ],
};

export default nextConfig;
