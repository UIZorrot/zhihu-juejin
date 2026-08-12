function normalizeTitleForLeakCheck(value: string): string {
  return value
    .toLocaleLowerCase("zh-CN")
    .replace(/[\p{P}\p{S}\s]+/gu, "")
    .replace(/(的回答|的文章|知乎专栏|知乎)$/u, "");
}

export function looksLikeTargetContent(candidateTitle: string, targetTitle: string): boolean {
  const candidate = normalizeTitleForLeakCheck(candidateTitle);
  const target = normalizeTitleForLeakCheck(targetTitle);
  if (candidate.length < 8 || target.length < 8) {
    return candidate === target;
  }
  if (candidate === target || candidate.includes(target) || target.includes(candidate)) {
    return true;
  }
  const targetBigrams = new Set(
    Array.from({ length: target.length - 1 }, (_, index) => target.slice(index, index + 2)),
  );
  const candidateBigrams = new Set(
    Array.from({ length: candidate.length - 1 }, (_, index) => candidate.slice(index, index + 2)),
  );
  const intersection = [...targetBigrams].filter((bigram) => candidateBigrams.has(bigram)).length;
  const union = new Set([...targetBigrams, ...candidateBigrams]).size;
  return union > 0 && intersection / union >= 0.72;
}
