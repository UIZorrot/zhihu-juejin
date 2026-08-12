import { describe, expect, test } from "bun:test";
import { ZhihuClient } from "./client";
import { ZhihuApiError, ZhihuProtocolError } from "./errors";

function createResponse(overrides: Record<string, unknown> = {}): Response {
  return Response.json({
    Code: 0,
    Message: "success",
    Data: {
      HasMore: false,
      Items: [],
    },
    ...overrides,
  });
}

describe("ZhihuClient", () => {
  test("adds documented authentication headers and query parameters", async () => {
    let capturedUrl: URL | undefined;
    let capturedHeaders: Headers | undefined;
    const client = new ZhihuClient({
      accessSecret: "test-secret",
      now: () => 1_750_000_000_000,
      fetch: async (input, init) => {
        capturedUrl = new URL(input);
        capturedHeaders = new Headers(init?.headers);
        return createResponse();
      },
    });

    await client.searchZhihu({ query: "Agent 深度评测", count: 4 });

    expect(capturedUrl?.pathname).toBe("/api/v1/content/zhihu_search");
    expect(capturedUrl?.searchParams.get("Query")).toBe("Agent 深度评测");
    expect(capturedUrl?.searchParams.get("Count")).toBe("4");
    expect(capturedHeaders?.get("Authorization")).toBe("Bearer test-secret");
    expect(capturedHeaders?.get("X-Request-Timestamp")).toBe("1750000000");
  });

  test("maps a documented API error", async () => {
    const client = new ZhihuClient({
      accessSecret: "test-secret",
      fetch: async () => createResponse({ Code: 30001, Message: "rate limited" }),
    });

    expect(client.searchZhihu({ query: "Agent" })).rejects.toBeInstanceOf(ZhihuApiError);
  });

  test("supports documented global search parameters", async () => {
    let capturedUrl: URL | undefined;
    const client = new ZhihuClient({
      accessSecret: "test-secret",
      fetch: async (input) => {
        capturedUrl = new URL(input);
        return createResponse();
      },
    });

    await client.searchGlobal({
      query: "Anthropic Riemann zeta",
      count: 12,
      searchDb: "realtime",
    });

    expect(capturedUrl?.pathname).toBe("/api/v1/content/global_search");
    expect(capturedUrl?.searchParams.get("Count")).toBe("12");
    expect(capturedUrl?.searchParams.get("SearchDB")).toBe("realtime");
  });

  test("rejects an undocumented response shape", async () => {
    const client = new ZhihuClient({
      accessSecret: "test-secret",
      fetch: async () => Response.json({ result: [] }),
    });

    expect(client.searchZhihu({ query: "Agent" })).rejects.toBeInstanceOf(ZhihuProtocolError);
  });
});
