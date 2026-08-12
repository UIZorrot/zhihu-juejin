import { getDomainFreshnessPolicy } from "./freshness";
import type {
  DomainFreshnessPolicy,
  FreshnessIntent,
  PlannedQuery,
  TopicNode,
  TopicPath,
} from "./types";

const DEPTH_INTENTS = [
  "深度分析 原理",
  "实测 经验 局限",
  "成本 对比 选型",
  "失败案例 踩坑",
  "最新进展 评测",
] as const;

const DOMAIN_DEPTH_INTENTS: Record<string, readonly string[]> = {
  "product-growth-media": ["案例 复盘", "方法 实践", "数据 效果", "失败 经验"],
  "finance-investing": ["深度分析 风险", "基本面 数据", "行业逻辑 周期", "投资框架"],
  "science-mathematics": ["原理 应用", "研究进展 解读", "学习路径", "问题与方法"],
  "energy-aerospace": ["技术原理", "产业分析", "项目进展", "成本与挑战"],
  "social-sciences-humanities": ["经典研究", "历史脉络", "理论争议", "现实案例"],
};

export interface QueryPlanOptions {
  maxQueries: number;
  rotationSeed?: number;
  now?: () => number;
}

interface DomainQueues {
  policy: DomainFreshnessPolicy;
  recent: PlannedQuery[];
  historical: PlannedQuery[];
  recentUsed: number;
  totalUsed: number;
}

function createTopicPaths(catalog: readonly TopicNode[]): TopicPath[] {
  const paths: TopicPath[] = [];
  for (const domain of catalog) {
    paths.push({ domain });
    for (const section of domain.children ?? []) {
      paths.push({ domain, section });
      for (const topic of section.children ?? []) {
        paths.push({ domain, section, topic });
      }
    }
  }
  return paths;
}

function nodeForPath(path: TopicPath): TopicNode {
  return path.topic ?? path.section ?? path.domain;
}

function queryLabel(node: TopicNode): string {
  return node.aliases[0] ?? node.label;
}

function minimumEditTime(now: number, maximumAgeDays: number | null): string | undefined {
  return maximumAgeDays === null
    ? undefined
    : new Date(now - maximumAgeDays * 24 * 60 * 60 * 1_000).toISOString();
}

function createQuery(
  path: TopicPath,
  query: string,
  intent: PlannedQuery["intent"],
  freshnessIntent: FreshnessIntent,
  minimumSourceEditTime: string | undefined,
): PlannedQuery {
  const node = nodeForPath(path);
  return {
    query,
    topicId: node.id,
    topicPath: [path.domain.label, path.section?.label, path.topic?.label].filter(
      (label): label is string => label !== undefined,
    ),
    level: node.level,
    priority: node.priority,
    cadence: node.cadence,
    intent,
    freshnessIntent,
    ...(minimumSourceEditTime ? { minimumSourceEditTime } : {}),
  };
}

function queriesForPath(path: TopicPath, rotationSeed: number, now: number): PlannedQuery[] {
  const node = nodeForPath(path);
  const label = queryLabel(node);
  const policy = getDomainFreshnessPolicy(path.domain.id);
  const year = new Date(now).getUTCFullYear();
  const recent = createQuery(
    path,
    `${label} ${year} 最新`,
    "discovery",
    "recent",
    minimumEditTime(now, policy.recentWindowDays),
  );

  const characterTotal = [...node.id].reduce(
    (total, character) => total + character.charCodeAt(0),
    0,
  );
  const intents = DOMAIN_DEPTH_INTENTS[path.domain.id] ?? DEPTH_INTENTS;
  const depthIntent = intents[(characterTotal + rotationSeed) % intents.length];
  const historical = createQuery(
    path,
    `${label} ${depthIntent}`,
    "depth",
    "historical",
    minimumEditTime(now, policy.historicalMaximumAgeDays),
  );
  return [recent, historical];
}

function sortQueue(queue: PlannedQuery[]): void {
  queue.sort(
    (left, right) =>
      right.priority - left.priority ||
      Number(right.level === "topic") - Number(left.level === "topic") ||
      left.query.localeCompare(right.query, "zh-CN"),
  );
}

function takeNextQuery(queues: DomainQueues): PlannedQuery | undefined {
  const desiredRecentCount = Math.ceil((queues.totalUsed + 1) * queues.policy.recentQueryShare);
  const preferRecent = queues.recentUsed < desiredRecentCount;
  const preferredQueue = preferRecent ? queues.recent : queues.historical;
  const fallbackQueue = preferRecent ? queues.historical : queues.recent;
  const next = preferredQueue.shift() ?? fallbackQueue.shift();
  if (next) {
    queues.totalUsed += 1;
    if (next.freshnessIntent === "recent") {
      queues.recentUsed += 1;
    }
  }
  return next;
}

export function buildTaxonomyQueryPlan(
  catalog: readonly TopicNode[],
  options: QueryPlanOptions,
): PlannedQuery[] {
  if (!Number.isInteger(options.maxQueries) || options.maxQueries < 1) {
    throw new RangeError("maxQueries must be a positive integer");
  }

  const rotationSeed = options.rotationSeed ?? 0;
  const now = (options.now ?? Date.now)();
  const domainQueues = new Map<string, DomainQueues>();
  for (const path of createTopicPaths(catalog)) {
    const queues = domainQueues.get(path.domain.id) ?? {
      policy: getDomainFreshnessPolicy(path.domain.id),
      recent: [],
      historical: [],
      recentUsed: 0,
      totalUsed: 0,
    };
    for (const plannedQuery of queriesForPath(path, rotationSeed, now)) {
      queues[plannedQuery.freshnessIntent].push(plannedQuery);
    }
    domainQueues.set(path.domain.id, queues);
  }

  for (const queues of domainQueues.values()) {
    sortQueue(queues.recent);
    sortQueue(queues.historical);
  }

  const result: PlannedQuery[] = [];
  const queues = [...domainQueues.values()];
  while (
    result.length < options.maxQueries &&
    queues.some((queue) => queue.recent.length > 0 || queue.historical.length > 0)
  ) {
    for (const queue of queues) {
      const next = takeNextQuery(queue);
      if (next) {
        result.push(next);
      }
      if (result.length >= options.maxQueries) {
        break;
      }
    }
  }

  const seen = new Set<string>();
  return result.filter((item) => {
    const key = item.query.toLocaleLowerCase("zh-CN");
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}
