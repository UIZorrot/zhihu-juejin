import { Value } from "@sinclair/typebox/value";
import { ZhihuApiError, ZhihuHttpError, ZhihuProtocolError } from "./errors";
import { type ZhihuSearchItem, ZhihuSearchResponseSchema } from "./schemas";

type FetchLike = (input: string | URL, init?: RequestInit) => Promise<Response>;

export interface ZhihuClientOptions {
  accessSecret: string;
  baseUrl?: string;
  fetch?: FetchLike;
  now?: () => number;
  timeoutMs?: number;
}

export interface ZhihuSearchOptions {
  query: string;
  count?: number;
  signal?: AbortSignal;
}

export interface ZhihuGlobalSearchOptions extends ZhihuSearchOptions {
  count?: number;
  filter?: string;
  searchDb?: "all" | "realtime" | "static";
}

export interface ZhihuSearchResult {
  hasMore: boolean;
  items: ZhihuSearchItem[];
}

const DEFAULT_BASE_URL = "https://developer.zhihu.com";
const DEFAULT_TIMEOUT_MS = 15_000;

export function decodeZhihuSearchResponse(rawText: string): ZhihuSearchResult {
  let decoded: unknown;
  try {
    decoded = JSON.parse(rawText);
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new ZhihuProtocolError("Zhihu returned a non-JSON response");
    }
    throw error;
  }

  if (!Value.Check(ZhihuSearchResponseSchema, decoded)) {
    throw new ZhihuProtocolError("Zhihu search response did not match the documented schema");
  }

  if (decoded.Code !== 0) {
    throw new ZhihuApiError(decoded.Code, decoded.Message);
  }

  return {
    hasMore: decoded.Data.HasMore,
    items: decoded.Data.Items,
  };
}

export class ZhihuClient {
  readonly #accessSecret: string;
  readonly #baseUrl: string;
  readonly #fetch: FetchLike;
  readonly #now: () => number;
  readonly #timeoutMs: number;

  constructor(options: ZhihuClientOptions) {
    const accessSecret = options.accessSecret.trim();
    if (!accessSecret) {
      throw new TypeError("Zhihu Access Secret is required");
    }

    this.#accessSecret = accessSecret;
    this.#baseUrl = (options.baseUrl ?? DEFAULT_BASE_URL).replace(/\/$/, "");
    this.#fetch = options.fetch ?? fetch;
    this.#now = options.now ?? Date.now;
    this.#timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  }

  async searchZhihu(options: ZhihuSearchOptions): Promise<ZhihuSearchResult> {
    const query = options.query.trim();
    if (!query) {
      throw new TypeError("Search query is required");
    }

    const count = options.count ?? 10;
    if (!Number.isInteger(count) || count < 1 || count > 10) {
      throw new RangeError("Zhihu search count must be an integer between 1 and 10");
    }

    const url = new URL("/api/v1/content/zhihu_search", this.#baseUrl);
    url.searchParams.set("Query", query);
    url.searchParams.set("Count", String(count));

    const timeoutSignal = AbortSignal.timeout(this.#timeoutMs);
    const signal = options.signal
      ? AbortSignal.any([options.signal, timeoutSignal])
      : timeoutSignal;

    const response = await this.#fetch(url, {
      headers: {
        Authorization: `Bearer ${this.#accessSecret}`,
        "Content-Type": "application/json",
        "X-Request-Timestamp": String(Math.floor(this.#now() / 1000)),
      },
      method: "GET",
      signal,
    });

    const rawText = await response.text();
    if (!response.ok) {
      throw new ZhihuHttpError(
        response.status,
        `Zhihu request failed with HTTP ${response.status}`,
      );
    }

    return decodeZhihuSearchResponse(rawText);
  }

  async searchGlobal(options: ZhihuGlobalSearchOptions): Promise<ZhihuSearchResult> {
    const query = options.query.trim();
    if (!query) {
      throw new TypeError("Search query is required");
    }

    const count = options.count ?? 10;
    if (!Number.isInteger(count) || count < 1 || count > 20) {
      throw new RangeError("Zhihu global search count must be an integer between 1 and 20");
    }

    const url = new URL("/api/v1/content/global_search", this.#baseUrl);
    url.searchParams.set("Query", query);
    url.searchParams.set("Count", String(count));
    if (options.filter) {
      url.searchParams.set("Filter", options.filter);
    }
    if (options.searchDb) {
      url.searchParams.set("SearchDB", options.searchDb);
    }

    const timeoutSignal = AbortSignal.timeout(this.#timeoutMs);
    const signal = options.signal
      ? AbortSignal.any([options.signal, timeoutSignal])
      : timeoutSignal;
    const response = await this.#fetch(url, {
      headers: {
        Authorization: `Bearer ${this.#accessSecret}`,
        "Content-Type": "application/json",
        "X-Request-Timestamp": String(Math.floor(this.#now() / 1000)),
      },
      method: "GET",
      signal,
    });
    const rawText = await response.text();
    if (!response.ok) {
      throw new ZhihuHttpError(
        response.status,
        `Zhihu request failed with HTTP ${response.status}`,
      );
    }
    return decodeZhihuSearchResponse(rawText);
  }
}
