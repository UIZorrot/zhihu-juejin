import { describe, expect, test } from "bun:test";
import { ZhihuCliClient } from "./cli-client";

const successfulResponse = JSON.stringify({
  Code: 0,
  Message: "success",
  Data: {
    HasMore: false,
    Items: [
      {
        Title: "Agent 评测",
        ContentType: "Article",
        ContentID: "123",
        ContentText: "包含具体测试数据",
        Url: "https://zhuanlan.zhihu.com/p/123",
        CommentCount: 2,
        VoteUpCount: 4,
        AuthorName: "作者",
        AuthorAvatar: "",
        EditTime: 1_786_300_000,
      },
    ],
  },
});

describe("ZhihuCliClient", () => {
  test("passes arguments without shell interpolation and decodes the official response", async () => {
    let capturedArguments: readonly string[] = [];
    const client = new ZhihuCliClient({
      binaryPath: "C:\\tools\\zhihu-cli.exe",
      run: async (_binaryPath, arguments_) => {
        capturedArguments = arguments_;
        return { exitCode: 0, stdout: successfulResponse, stderr: "" };
      },
    });

    const result = await client.searchZhihu({ query: "AI Agent 最新", count: 3 });

    expect(capturedArguments).toEqual([
      "search",
      "zhihu",
      "--query",
      "AI Agent 最新",
      "--count",
      "3",
    ]);
    expect(result.items[0]?.ContentID).toBe("123");
  });

  test("does not expose CLI stderr when the command fails", async () => {
    const client = new ZhihuCliClient({
      binaryPath: "C:\\tools\\zhihu-cli.exe",
      run: async () => ({ exitCode: 1, stdout: "", stderr: "sensitive diagnostic" }),
    });

    expect(client.searchZhihu({ query: "Agent" })).rejects.toThrow(
      "Zhihu CLI search failed with exit code 1",
    );
  });

  test("passes global search options as separate CLI arguments", async () => {
    let capturedArguments: readonly string[] = [];
    const client = new ZhihuCliClient({
      binaryPath: "C:\\tools\\zhihu-cli.exe",
      run: async (_binaryPath, arguments_) => {
        capturedArguments = arguments_;
        return { exitCode: 0, stdout: successfulResponse, stderr: "" };
      },
    });

    await client.searchGlobal({
      query: "Riemann zeta",
      count: 5,
      searchDb: "realtime",
    });

    expect(capturedArguments).toEqual([
      "search",
      "global",
      "--query",
      "Riemann zeta",
      "--count",
      "5",
      "--search-db",
      "realtime",
    ]);
  });
});
