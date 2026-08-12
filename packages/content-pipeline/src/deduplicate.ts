import type { NormalizedContent } from "@zhihu-juejin/contracts";

export function deduplicateContent(items: NormalizedContent[]): NormalizedContent[] {
  const byContentId = new Map<string, NormalizedContent>();
  const contentIdByUrl = new Map<string, string>();

  for (const item of items) {
    const existingId = contentIdByUrl.get(item.canonicalUrl) ?? item.id;
    const existing = byContentId.get(existingId);

    if (existing) {
      existing.discoveredBy = [...new Set([...existing.discoveredBy, ...item.discoveredBy])];
      existing.candidateTopicIds = [
        ...new Set([...existing.candidateTopicIds, ...item.candidateTopicIds]),
      ];
      continue;
    }

    byContentId.set(item.id, { ...item, discoveredBy: [...item.discoveredBy] });
    contentIdByUrl.set(item.canonicalUrl, item.id);
  }

  return [...byContentId.values()];
}
