import { createHash } from "node:crypto";
import type { NormalizedContent } from "@zhihu-juejin/contracts";
import type { ZhihuSearchItem } from "@zhihu-juejin/zhihu-client";

const TRACKING_QUERY_PARAMETERS = new Set([
  "source",
  "utm_campaign",
  "utm_content",
  "utm_medium",
  "utm_source",
  "utm_term",
]);

function decodeCommonHtmlEntities(value: string): string {
  return value
    .replaceAll("&nbsp;", " ")
    .replaceAll("&amp;", "&")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'");
}

export function cleanSearchText(value: string): string {
  return decodeCommonHtmlEntities(value.replace(/<[^>]*>/g, " "))
    .replace(/\s+/g, " ")
    .trim();
}

export function canonicalizeUrl(value: string): string {
  const url = new URL(value);
  url.hash = "";

  for (const parameter of [...url.searchParams.keys()]) {
    if (TRACKING_QUERY_PARAMETERS.has(parameter) || parameter.startsWith("utm_")) {
      url.searchParams.delete(parameter);
    }
  }

  url.searchParams.sort();
  return url.toString();
}

function normalizeContentType(value: string): NormalizedContent["contentType"] {
  switch (value.trim().toLowerCase()) {
    case "article":
      return "article";
    case "answer":
      return "answer";
    case "question":
      return "question";
    default:
      return "other";
  }
}

function createProvisionalIdentityKey(authorName: string, avatarUrl: string): string {
  const identityEvidence = `${authorName.trim().toLocaleLowerCase("zh-CN")}|${avatarUrl.trim()}`;
  return createHash("sha256").update(identityEvidence).digest("hex");
}

function parseAuthorityLevel(value: string | undefined): number | undefined {
  if (value === undefined || value.trim() === "") {
    return undefined;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? undefined : parsed;
}

export function normalizeZhihuSearchItem(
  item: ZhihuSearchItem,
  sourceQuery: string,
  candidateTopicIds: readonly string[] = [],
): NormalizedContent {
  const contentType = normalizeContentType(item.ContentType);
  const avatarUrl = item.AuthorAvatar.trim() || undefined;

  return {
    id: `zhihu:${contentType}:${item.ContentID}`,
    source: "zhihu",
    sourceContentId: item.ContentID,
    contentType,
    canonicalUrl: canonicalizeUrl(item.Url),
    title: cleanSearchText(item.Title),
    excerpt: cleanSearchText(item.ContentText),
    author: {
      displayName: cleanSearchText(item.AuthorName),
      ...(avatarUrl ? { avatarUrl } : {}),
      provisionalIdentityKey: createProvisionalIdentityKey(item.AuthorName, item.AuthorAvatar),
    },
    metrics: {
      likes: item.VoteUpCount,
      comments: item.CommentCount,
    },
    ...(parseAuthorityLevel(item.AuthorityLevel) === undefined
      ? {}
      : { authorityLevel: parseAuthorityLevel(item.AuthorityLevel) }),
    ...(item.EditTime > 0 ? { updatedAt: new Date(item.EditTime * 1000).toISOString() } : {}),
    discoveredBy: [sourceQuery],
    candidateTopicIds: [...new Set(candidateTopicIds)],
  };
}
