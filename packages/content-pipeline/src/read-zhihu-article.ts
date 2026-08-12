const ARTICLE_SAMPLE_CHARACTERS = 4_000;
const MAXIMUM_RESPONSE_BYTES = 2_000_000;
const MINIMUM_COMPLETE_ARTICLE_CHARACTERS = 1_500;
const DEFAULT_ARTICLE_READER_BASE_URL = "https://r.jina.ai";
const REDIRECT_STATUS_CODES = [301, 302, 303, 307, 308];

type FetchLike = (input: string | URL, init?: RequestInit) => Promise<Response>;

function createDefaultFetch(): FetchLike {
  return fetch;
}

interface ZhihuAppViewPost {
  id: string;
  title: string;
  content: string;
  created?: number;
  updated?: number;
}

interface ZhihuInitialData {
  initialState?: {
    post?: Record<string, ZhihuAppViewPost>;
    entities?: {
      answers?: Record<string, ZhihuAnswerEntity>;
      questions?: Record<string, ZhihuQuestionEntity>;
    };
  };
}

interface ZhihuAnswerEntity {
  id: string;
  content: string;
  createdTime?: number;
  updatedTime?: number;
  author?: {
    name?: string;
    headline?: string;
    badge?: Array<{
      description?: string;
      topics?: Array<{ name?: string }>;
    }>;
  };
  question?: { id?: string; title?: string };
}

interface ZhihuQuestionEntity {
  id: string;
  title: string;
  detail?: string;
  excerpt?: string;
}

export interface ZhihuArticleSearchPort {
  searchZhihu(options: { query: string; count?: number }): Promise<{
    items: Array<{ Url: string; ContentText: string }>;
  }>;
}

export interface ReadZhihuArticleOptions {
  fetch?: FetchLike;
  articleReaderFetch?: FetchLike;
  articleReaderBaseUrl?: string;
  maximumCharacters?: number;
  searchClient?: ZhihuArticleSearchPort;
}

export interface ReadZhihuArticleResult {
  sourceContentId: string;
  canonicalUrl: string;
  title: string;
  contentType: "article" | "answer";
  author?: string;
  authorContext?: {
    name?: string;
    headline?: string;
    badges: string[];
    topicExpertise: string[];
  };
  text: string;
  citations: string[];
  embeddedImages: string[];
  questionContext?: {
    text: string;
    citations: string[];
  };
  publishedAt?: string;
  updatedAt?: string;
  sourceCharacterCount: number;
  sampledCharacterCount: number;
  truncated: boolean;
  textSource: "app_view" | "answer_page" | "open_platform_search" | "article_reader_fallback";
}

export interface ParsedZhihuInput {
  sourceContentId: string;
  canonicalUrl: string;
  pageUrl: string;
  contentType: "article" | "answer";
  questionId?: string;
  titleHint?: string;
  authorHint?: string;
}

export class ZhihuArticleReadError extends Error {
  readonly code: "INVALID_URL" | "UNSUPPORTED_CONTENT" | "FETCH_FAILED" | "CONTENT_MISSING";

  constructor(code: ZhihuArticleReadError["code"], message: string) {
    super(message);
    this.name = "ZhihuArticleReadError";
    this.code = code;
  }
}

function decodeHtmlEntities(value: string): string {
  return value
    .replaceAll("&nbsp;", " ")
    .replaceAll("&amp;", "&")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'")
    .replace(/&#(\d+);/g, (_match, code: string) => String.fromCodePoint(Number(code)));
}

function htmlToText(html: string): string {
  return decodeHtmlEntities(
    html
      .replace(/<(script|style|svg)[^>]*>[\s\S]*?<\/\1>/giu, " ")
      .replace(/<br\s*\/?>/giu, "\n")
      .replace(/<\/(p|div|h[1-6]|li|blockquote|figure|section)>/giu, "\n")
      .replace(/<[^>]+>/g, " "),
  )
    .replace(/[\t\f\v ]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function extractCitations(html: string): string[] {
  const citations = new Set<string>();
  for (const match of html.matchAll(
    /\b(?:href|data-text|data-url|data-tooltip)=["'](https?:\/\/[^"']+)["']/giu,
  )) {
    const rawUrl = decodeHtmlEntities(match[1] ?? "");
    try {
      let url = new URL(rawUrl);
      if (url.hostname === "link.zhihu.com") {
        const target = url.searchParams.get("target");
        if (target) {
          url = new URL(target);
        }
      }
      if (url.protocol === "http:" || url.protocol === "https:") {
        url.hash = "";
        citations.add(url.toString());
      }
    } catch {
      // Relative and malformed links are not external citations.
    }
  }
  return [...citations].slice(0, 30);
}

function extractPlainTextUrls(text: string): string[] {
  return [...new Set(text.match(/https?:\/\/[^\s<>"']+/giu) ?? [])].slice(0, 30);
}

function extractEmbeddedImages(html: string): string[] {
  const images = new Set<string>();
  for (const match of html.matchAll(/<img\b[^>]*>/giu)) {
    const tag = match[0];
    const rawUrl =
      tag.match(/\bdata-original=["']([^"']+)["']/iu)?.[1] ??
      tag.match(/\bdata-actualsrc=["']([^"']+)["']/iu)?.[1] ??
      tag.match(/\bsrc=["']([^"']+)["']/iu)?.[1];
    if (!rawUrl) {
      continue;
    }
    try {
      const url = new URL(decodeHtmlEntities(rawUrl));
      if (url.protocol === "https:" && url.hostname.endsWith("zhimg.com")) {
        images.add(url.toString());
      }
    } catch {
      // Ignore placeholders and malformed image URLs.
    }
  }
  return [...images].slice(0, 20);
}

function isExternalCitation(rawUrl: string): boolean {
  try {
    const url = new URL(rawUrl);
    return (
      (url.protocol === "http:" || url.protocol === "https:") &&
      !url.hostname.endsWith("zhihu.com") &&
      !url.hostname.endsWith("zhimg.com")
    );
  } catch {
    return false;
  }
}

function markdownToText(markdown: string): string {
  const contentMarker = "Markdown Content:";
  const content = markdown.includes(contentMarker)
    ? markdown.slice(markdown.indexOf(contentMarker) + contentMarker.length)
    : markdown;
  return decodeHtmlEntities(
    content
      .replace(/!\[([^\]]*)\]\((?:[^()]|\([^()]*\))*\)/gu, "$1")
      .replace(/\[([^\]]+)\]\((?:[^()]|\([^()]*\))*\)/gu, "$1")
      .replace(/^\s{0,3}(?:#{1,6}|>|[-+*]|\d+\.)\s+/gmu, "")
      .replace(/[*_~`]+/gu, "")
      .replace(/<[^>]+>/gu, " "),
  )
    .replace(/[\t\f\v ]+/gu, " ")
    .replace(/ *\n */gu, "\n")
    .replace(/\n{3,}/gu, "\n\n")
    .trim();
}

function extractMarkdownLinks(markdown: string): string[] {
  const links = new Set<string>();
  for (const match of markdown.matchAll(/!?\[[^\]]*\]\(((?:[^()]|\([^()]*\))*)\)/gu)) {
    const rawUrl = decodeHtmlEntities(match[1] ?? "").trim();
    if (isExternalCitation(rawUrl)) {
      links.add(rawUrl);
    }
  }
  return [...links].slice(0, 30);
}

function extractMarkdownImages(markdown: string): string[] {
  const images = new Set<string>();
  for (const match of markdown.matchAll(/!\[[^\]]*\]\(((?:[^()]|\([^()]*\))*)\)/gu)) {
    const rawUrl = decodeHtmlEntities(match[1] ?? "").trim();
    try {
      const url = new URL(rawUrl);
      if (url.protocol === "https:" && url.hostname.endsWith("zhimg.com")) {
        images.add(url.toString());
      }
    } catch {
      // Ignore malformed image URLs returned by the reader.
    }
  }
  return [...images].slice(0, 20);
}

interface ArticleReaderResult {
  text: string;
  citations: string[];
  embeddedImages: string[];
}

async function readArticleWithFallback(
  canonicalUrl: string,
  fetcher: FetchLike,
  baseUrl: string,
): Promise<ArticleReaderResult | undefined> {
  const normalizedBaseUrl = baseUrl.replace(/\/+$/u, "");
  const sourceUrls = [canonicalUrl, canonicalUrl.replace(/^https:/u, "http:")];
  for (const sourceUrl of sourceUrls) {
    let response: Response;
    try {
      response = await fetchWithRedirects(fetcher, `${normalizedBaseUrl}/${sourceUrl}`, {
        headers: {
          Accept: "text/markdown,text/plain;q=0.9",
          "User-Agent": "ZhihuJuejin/1.0",
        },
        signal: AbortSignal.timeout(25_000),
      });
    } catch {
      continue;
    }
    if (!response.ok) {
      continue;
    }
    let markdown: string;
    try {
      markdown = await readLimitedBody(response);
    } catch {
      continue;
    }
    const text = markdownToText(markdown);
    if (text.length < 80) {
      continue;
    }
    return {
      text,
      citations: extractMarkdownLinks(markdown),
      embeddedImages: extractMarkdownImages(markdown),
    };
  }
  return undefined;
}

export function sampleArticleText(
  text: string,
  maximumCharacters = ARTICLE_SAMPLE_CHARACTERS,
): string {
  if (
    !Number.isInteger(maximumCharacters) ||
    maximumCharacters < 500 ||
    maximumCharacters > 20_000
  ) {
    throw new RangeError("maximumCharacters must be an integer between 500 and 20000");
  }
  if (text.length <= maximumCharacters) {
    return text;
  }
  const headCharacters = Math.ceil(maximumCharacters / 2);
  const tailCharacters = maximumCharacters - headCharacters;
  return `${text.slice(0, headCharacters)}${text.slice(-tailCharacters)}`;
}

function cleanExtractedUrl(value: string): string {
  return value.replace(/[)）\]】}>》」』，。；、！？!?]+$/u, "");
}

function parseShareHints(prefix: string): { titleHint?: string; authorHint?: string } {
  const answerDescriptor = prefix.trim().match(/^(.*?)\s*-\s*(.*?)\s*的回答\s*-\s*知乎\s*$/u);
  if (!answerDescriptor) {
    return {};
  }
  const titleHint = answerDescriptor[1]?.trim();
  const authorHint = answerDescriptor[2]?.trim();
  return {
    ...(titleHint ? { titleHint } : {}),
    ...(authorHint ? { authorHint } : {}),
  };
}

export function parseZhihuInput(value: string): ParsedZhihuInput {
  const urlMatch = value.match(/https:\/\/(?:www\.zhihu\.com|zhuanlan\.zhihu\.com)\/[^\s<>"']+/iu);
  const rawUrl = cleanExtractedUrl(urlMatch?.[0] ?? value.trim());
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new ZhihuArticleReadError(
      "INVALID_URL",
      "没有识别到知乎链接。可以直接粘贴完整的知乎分享文本。",
    );
  }
  const hostname = url.hostname.toLocaleLowerCase("en-US");
  if (url.protocol !== "https:" || !["zhuanlan.zhihu.com", "www.zhihu.com"].includes(hostname)) {
    throw new ZhihuArticleReadError("INVALID_URL", "目前支持知乎专栏文章和问题回答链接");
  }
  const hints = parseShareHints(urlMatch?.index ? value.slice(0, urlMatch.index) : "");
  const articleMatch = url.pathname.match(/^\/p\/(\d+)\/?$/u);
  if (articleMatch?.[1]) {
    const id = articleMatch[1];
    return {
      sourceContentId: id,
      canonicalUrl: `https://zhuanlan.zhihu.com/p/${id}`,
      pageUrl: `https://www.zhihu.com/appview/p/${id}`,
      contentType: "article",
      ...hints,
    };
  }
  const answerMatch = url.pathname.match(/^\/question\/(\d+)\/answer\/(\d+)\/?$/u);
  if (answerMatch?.[1] && answerMatch[2]) {
    const questionId = answerMatch[1];
    const answerId = answerMatch[2];
    const canonicalUrl = `https://www.zhihu.com/question/${questionId}/answer/${answerId}`;
    return {
      sourceContentId: answerId,
      questionId,
      canonicalUrl,
      pageUrl: canonicalUrl,
      contentType: "answer",
      ...hints,
    };
  }
  throw new ZhihuArticleReadError(
    "UNSUPPORTED_CONTENT",
    "已识别知乎链接，但它不是专栏文章或问题回答",
  );
}

async function readLimitedBody(response: Response): Promise<string> {
  const contentLength = Number(response.headers.get("content-length") ?? 0);
  if (contentLength > MAXIMUM_RESPONSE_BYTES) {
    throw new ZhihuArticleReadError("FETCH_FAILED", "文章页面响应过大，已停止读取");
  }
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (bytes.byteLength > MAXIMUM_RESPONSE_BYTES) {
    throw new ZhihuArticleReadError("FETCH_FAILED", "文章页面响应过大，已停止读取");
  }
  return new TextDecoder().decode(bytes);
}

async function fetchWithRedirects(
  fetcher: FetchLike,
  input: string,
  init: RequestInit,
  maximumRedirects = 5,
): Promise<Response> {
  let url = input;
  for (let redirectCount = 0; redirectCount <= maximumRedirects; redirectCount += 1) {
    const response = await fetcher(url, { ...init, redirect: "manual" });
    if (!REDIRECT_STATUS_CODES.includes(response.status)) {
      return response;
    }
    const location = response.headers.get("location");
    if (!location || redirectCount === maximumRedirects) {
      return response;
    }
    url = new URL(location, url).toString();
  }
  throw new ZhihuArticleReadError("FETCH_FAILED", "专栏备用读取重定向次数过多");
}

export async function readZhihuArticle(
  value: string,
  options: ReadZhihuArticleOptions = {},
): Promise<ReadZhihuArticleResult> {
  const target = parseZhihuInput(value);
  const fetcher = options.fetch ?? createDefaultFetch();
  const response = await fetcher(target.pageUrl, {
    headers: {
      Accept: "text/html,application/xhtml+xml",
      "User-Agent": "ZhihuHybrid/7.0.0 (iPhone; iOS 17.0)",
    },
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) {
    throw new ZhihuArticleReadError("FETCH_FAILED", `知乎页面读取失败（HTTP ${response.status}）`);
  }

  const html = await readLimitedBody(response);
  const initialDataMatch = html.match(
    /<script id="js-initialData" type="text\/json">([\s\S]*?)<\/script>/u,
  );
  if (!initialDataMatch?.[1]) {
    throw new ZhihuArticleReadError("CONTENT_MISSING", "页面中没有找到可评分的文章正文");
  }

  const initialData = JSON.parse(initialDataMatch[1]) as ZhihuInitialData;
  const post = initialData.initialState?.post?.[target.sourceContentId];
  const answer = initialData.initialState?.entities?.answers?.[target.sourceContentId];
  const questionId = target.questionId ?? answer?.question?.id;
  const question = questionId
    ? initialData.initialState?.entities?.questions?.[questionId]
    : undefined;
  const source = target.contentType === "article" ? post : answer;
  const title = post?.title ?? answer?.question?.title ?? target.titleHint;
  if (!title || !source?.content) {
    throw new ZhihuArticleReadError("CONTENT_MISSING", "页面中没有找到可评分的正文");
  }

  let fullText = htmlToText(source.content);
  let fallbackCitations: string[] = [];
  let fallbackImages: string[] = [];
  let textSource: ReadZhihuArticleResult["textSource"] =
    target.contentType === "article" ? "app_view" : "answer_page";
  if (target.contentType === "article" && fullText.length < MINIMUM_COMPLETE_ARTICLE_CHARACTERS) {
    const articleReaderFetch = options.articleReaderFetch ?? (options.fetch ? undefined : fetcher);
    if (articleReaderFetch) {
      const readerResult = await readArticleWithFallback(
        target.canonicalUrl,
        articleReaderFetch,
        options.articleReaderBaseUrl ?? DEFAULT_ARTICLE_READER_BASE_URL,
      );
      if (readerResult && readerResult.text.length > fullText.length) {
        fullText = readerResult.text;
        fallbackCitations = readerResult.citations;
        fallbackImages = readerResult.embeddedImages;
        textSource = "article_reader_fallback";
      }
    }
  }
  if (
    target.contentType === "article" &&
    fullText.length < MINIMUM_COMPLETE_ARTICLE_CHARACTERS &&
    options.searchClient
  ) {
    const searchResult = await options.searchClient.searchZhihu({ query: title, count: 10 });
    const exactItem = searchResult.items.find((item) => {
      try {
        return (
          new URL(item.Url).pathname.replace(/\/$/u, "") === new URL(target.canonicalUrl).pathname
        );
      } catch {
        return false;
      }
    });
    const searchText = exactItem ? htmlToText(exactItem.ContentText) : "";
    if (searchText.length > fullText.length) {
      fullText = searchText;
      textSource = "open_platform_search";
    }
  }
  if (!fullText.trim()) {
    throw new ZhihuArticleReadError("CONTENT_MISSING", "页面中没有找到可评分的正文");
  }
  if (target.contentType === "article" && fullText.length < 80) {
    throw new ZhihuArticleReadError("CONTENT_MISSING", "专栏正文过短，无法进行可靠评分");
  }
  const maximumCharacters = options.maximumCharacters ?? ARTICLE_SAMPLE_CHARACTERS;
  const text = sampleArticleText(fullText, maximumCharacters);
  const authorBadges = [
    ...new Set(
      (answer?.author?.badge ?? [])
        .map((badge) => badge.description?.trim())
        .filter((description): description is string => Boolean(description)),
    ),
  ];
  const authorTopicExpertise = [
    ...new Set(
      (answer?.author?.badge ?? [])
        .flatMap((badge) => badge.topics ?? [])
        .map((topic) => topic.name?.trim())
        .filter((name): name is string => Boolean(name)),
    ),
  ];
  const authorName = answer?.author?.name ?? target.authorHint;

  return {
    sourceContentId: target.sourceContentId,
    canonicalUrl: target.canonicalUrl,
    title: htmlToText(title),
    contentType: target.contentType,
    ...(authorName ? { author: authorName } : {}),
    ...(answer?.author
      ? {
          authorContext: {
            ...(authorName ? { name: authorName } : {}),
            ...(answer.author.headline ? { headline: answer.author.headline } : {}),
            badges: authorBadges,
            topicExpertise: authorTopicExpertise,
          },
        }
      : {}),
    text,
    citations: [
      ...new Set([
        ...extractCitations(source.content),
        ...extractPlainTextUrls(fullText),
        ...fallbackCitations,
      ]),
    ],
    embeddedImages: [
      ...new Set([...extractEmbeddedImages(source.content), ...fallbackImages]),
    ].slice(0, 20),
    ...(question?.detail || question?.excerpt
      ? {
          questionContext: {
            text: htmlToText(question.detail ?? question.excerpt ?? ""),
            citations: extractCitations(question.detail ?? ""),
          },
        }
      : {}),
    ...(post?.created || answer?.createdTime
      ? { publishedAt: new Date((post?.created ?? answer?.createdTime ?? 0) * 1_000).toISOString() }
      : {}),
    ...(post?.updated || answer?.updatedTime
      ? { updatedAt: new Date((post?.updated ?? answer?.updatedTime ?? 0) * 1_000).toISOString() }
      : {}),
    sourceCharacterCount: fullText.length,
    sampledCharacterCount: text.length,
    truncated: fullText.length > text.length,
    textSource,
  };
}
