import { auditPolicy } from "@zhihu-juejin/audit-engine";
import { aiAgentDeepReviewsManifest } from "@zhihu-juejin/feed-engine";
import { recommendationPolicy } from "@zhihu-juejin/recommendation-engine";
import { getDomainFreshnessPolicy, knowledgeTaxonomy } from "@zhihu-juejin/taxonomy";
import Fastify from "fastify";

export function createApp() {
  const app = Fastify({
    logger: true,
  });

  app.get("/health", async () => ({ status: "ok" }));

  app.get("/v1/feeds", async () => ({
    items: [aiAgentDeepReviewsManifest],
  }));

  app.get("/v1/policies/participation", async () => ({
    audit: auditPolicy,
    recommendation: recommendationPolicy,
  }));

  app.get("/v1/taxonomy", async () => ({
    version: "taxonomy-v1",
    items: knowledgeTaxonomy.map((domain) => ({
      ...domain,
      freshnessPolicy: getDomainFreshnessPolicy(domain.id),
    })),
  }));

  return app;
}
