export type TopicLevel = "domain" | "section" | "topic";
export type CrawlCadence = "daily" | "twice_weekly" | "weekly";
export type FreshnessIntent = "recent" | "historical";

export interface DomainFreshnessPolicy {
  recentQueryShare: number;
  recentWindowDays: number;
  historicalMaximumAgeDays: number | null;
  decayHalfLifeDays: number;
}

export interface TopicNode {
  id: string;
  label: string;
  level: TopicLevel;
  aliases: readonly string[];
  priority: number;
  cadence: CrawlCadence;
  children?: readonly TopicNode[];
}

export interface TopicPath {
  domain: TopicNode;
  section?: TopicNode;
  topic?: TopicNode;
}

export interface PlannedQuery {
  query: string;
  topicId: string;
  topicPath: readonly string[];
  level: TopicLevel;
  priority: number;
  cadence: CrawlCadence;
  intent: "discovery" | "depth";
  freshnessIntent: FreshnessIntent;
  minimumSourceEditTime?: string;
}
