import {
  aiAgentDeepReviewsManifest,
  discoverFeedCandidates,
  discoverTaxonomyCandidates,
} from "@zhihu-juejin/feed-engine";
import {
  DeepSeekClient,
  type DeepSeekModel,
  triageContentPreview,
} from "@zhihu-juejin/llm-evaluator";
import { triageDiscoveredCandidates } from "@zhihu-juejin/quality-pipeline";
import { buildTaxonomyQueryPlan, knowledgeTaxonomy } from "@zhihu-juejin/taxonomy";
import { ZhihuCliClient, ZhihuClient } from "@zhihu-juejin/zhihu-client";

function getArgument(name: string): string | undefined {
  const index = Bun.argv.indexOf(name);
  return index === -1 ? undefined : Bun.argv[index + 1];
}

function getIntegerArgument(
  name: string,
  fallback: number,
  minimum: number,
  maximum: number,
): number {
  const value = getArgument(name);
  if (value === undefined) {
    return fallback;
  }
  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed < minimum || parsed > maximum) {
    throw new RangeError(`${name} must be an integer between ${minimum} and ${maximum}`);
  }
  return parsed;
}

function createZhihuClient(): ZhihuClient | ZhihuCliClient {
  const accessSecret = process.env.ZHIHU_ACCESS_SECRET?.trim();
  if (accessSecret) {
    return new ZhihuClient({
      accessSecret,
      ...(process.env.ZHIHU_API_BASE_URL ? { baseUrl: process.env.ZHIHU_API_BASE_URL } : {}),
    });
  }

  const cliPath = getArgument("--cli-path")?.trim() || process.env.ZHIHU_CLI_PATH?.trim();
  if (cliPath) {
    return new ZhihuCliClient({ binaryPath: cliPath });
  }

  throw new Error(
    "ZHIHU_ACCESS_SECRET is required for direct HTTP ingestion; local smoke runs may use --cli-path or ZHIHU_CLI_PATH.",
  );
}

function createTaxonomyPlan() {
  const plan = buildTaxonomyQueryPlan(knowledgeTaxonomy, {
    maxQueries: getIntegerArgument("--max-queries", 100, 1, 1_000),
    rotationSeed: getIntegerArgument("--rotation", 0, 0, 1_000_000),
  });
  const queryOverride = getArgument("--query")?.trim();
  if (!queryOverride) {
    return plan;
  }
  const firstQuery = plan[0];
  if (!firstQuery) {
    throw new Error("Cannot override an empty taxonomy plan");
  }
  return [{ ...firstQuery, query: queryOverride }];
}

function createDeepSeekClient(): DeepSeekClient {
  const apiKey = process.env.DEEPSEEK_API_KEY?.trim() || process.env.APIKEY?.trim();
  if (!apiKey) {
    throw new Error("DEEPSEEK_API_KEY is required when --llm-triage is enabled");
  }
  const configuredModel = process.env.DEEPSEEK_MODEL ?? "deepseek-v4-flash";
  if (configuredModel !== "deepseek-v4-flash" && configuredModel !== "deepseek-v4-pro") {
    throw new Error("DEEPSEEK_MODEL must be deepseek-v4-flash or deepseek-v4-pro");
  }
  return new DeepSeekClient({
    apiKey,
    model: configuredModel satisfies DeepSeekModel,
    ...(process.env.DEEPSEEK_API_BASE_URL ? { baseUrl: process.env.DEEPSEEK_API_BASE_URL } : {}),
  });
}

async function main(): Promise<void> {
  const command = Bun.argv[2];

  if (command === "plan-taxonomy") {
    process.stdout.write(`${JSON.stringify(createTaxonomyPlan(), null, 2)}\n`);
    return;
  }

  if (command === "discover-taxonomy") {
    const result = await discoverTaxonomyCandidates(createZhihuClient(), createTaxonomyPlan(), {
      resultsPerQuery: getIntegerArgument("--count", 10, 1, 10),
    });
    if (Bun.argv.includes("--llm-triage")) {
      const deepSeek = createDeepSeekClient();
      const triage = await triageDiscoveredCandidates(
        { evaluate: (input) => triageContentPreview(deepSeek, input) },
        result.candidates,
        {
          maximumEvaluations: getIntegerArgument(
            "--max-evaluations",
            Math.min(result.candidates.length, 50),
            0,
            10_000,
          ),
        },
      );
      const triageSummary = {
        acquireFullText: triage.filter((item) => item.decision === "acquire_full_text").length,
        humanReview: triage.filter((item) => item.decision === "human_review").length,
        rejected: triage.filter((item) => item.decision === "reject").length,
      };
      process.stdout.write(`${JSON.stringify({ ...result, triageSummary, triage }, null, 2)}\n`);
      return;
    }
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    return;
  }

  if (command === "discover-experiment") {
    const queryOverride = getArgument("--query")?.trim();
    const manifest = {
      ...aiAgentDeepReviewsManifest,
      ...(queryOverride ? { queries: [queryOverride] } : {}),
      maxResultsPerQuery: getIntegerArgument("--count", 10, 1, 10),
    };
    const result = await discoverFeedCandidates(createZhihuClient(), manifest);
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    return;
  }

  throw new Error("Usage: plan-taxonomy | discover-taxonomy | discover-experiment [options]");
}

await main();
