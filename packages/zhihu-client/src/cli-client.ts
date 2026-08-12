import { spawn } from "node:child_process";
import {
  decodeZhihuSearchResponse,
  type ZhihuGlobalSearchOptions,
  type ZhihuSearchOptions,
  type ZhihuSearchResult,
} from "./client";

export interface ZhihuCliRunResult {
  exitCode: number;
  stdout: string;
  stderr: string;
}

export type ZhihuCliRunner = (
  binaryPath: string,
  arguments_: readonly string[],
  timeoutMs: number,
) => Promise<ZhihuCliRunResult>;

export interface ZhihuCliClientOptions {
  binaryPath: string;
  run?: ZhihuCliRunner;
  timeoutMs?: number;
}

const DEFAULT_TIMEOUT_MS = 30_000;
const MAXIMUM_OUTPUT_BYTES = 2_000_000;

async function runCli(
  binaryPath: string,
  arguments_: readonly string[],
  timeoutMs: number,
): Promise<ZhihuCliRunResult> {
  return new Promise((resolve, reject) => {
    const child = spawn(binaryPath, [...arguments_], {
      shell: false,
      windowsHide: true,
      stdio: ["ignore", "pipe", "pipe"],
    });
    const stdout: Buffer[] = [];
    const stderr: Buffer[] = [];
    let outputBytes = 0;
    let settled = false;
    const finish = (callback: () => void) => {
      if (!settled) {
        settled = true;
        clearTimeout(timeout);
        callback();
      }
    };
    const collect = (target: Buffer[], chunk: Buffer) => {
      outputBytes += chunk.byteLength;
      if (outputBytes > MAXIMUM_OUTPUT_BYTES) {
        child.kill();
        finish(() => reject(new Error("Zhihu CLI output exceeded the safety limit")));
        return;
      }
      target.push(chunk);
    };
    child.stdout.on("data", (chunk: Buffer) => collect(stdout, chunk));
    child.stderr.on("data", (chunk: Buffer) => collect(stderr, chunk));
    child.on("error", (error) => finish(() => reject(error)));
    child.on("close", (exitCode) =>
      finish(() =>
        resolve({
          exitCode: exitCode ?? -1,
          stdout: Buffer.concat(stdout).toString("utf8"),
          stderr: Buffer.concat(stderr).toString("utf8"),
        }),
      ),
    );
    const timeout = setTimeout(() => {
      child.kill();
      finish(() => reject(new Error(`Zhihu CLI timed out after ${timeoutMs}ms`)));
    }, timeoutMs);
  });
}

export class ZhihuCliClient {
  readonly #binaryPath: string;
  readonly #run: ZhihuCliRunner;
  readonly #timeoutMs: number;

  constructor(options: ZhihuCliClientOptions) {
    const binaryPath = options.binaryPath.trim();
    if (!binaryPath) {
      throw new TypeError("Zhihu CLI binary path is required");
    }
    this.#binaryPath = binaryPath;
    this.#run = options.run ?? runCli;
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

    const result = await this.#run(
      this.#binaryPath,
      ["search", "zhihu", "--query", query, "--count", String(count)],
      this.#timeoutMs,
    );
    if (result.exitCode !== 0) {
      throw new Error(`Zhihu CLI search failed with exit code ${result.exitCode}`);
    }
    return decodeZhihuSearchResponse(result.stdout);
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
    const arguments_ = ["search", "global", "--query", query, "--count", String(count)];
    if (options.filter) {
      arguments_.push("--filter", options.filter);
    }
    if (options.searchDb) {
      arguments_.push("--search-db", options.searchDb);
    }
    const result = await this.#run(this.#binaryPath, arguments_, this.#timeoutMs);
    if (result.exitCode !== 0) {
      throw new Error(`Zhihu CLI global search failed with exit code ${result.exitCode}`);
    }
    return decodeZhihuSearchResponse(result.stdout);
  }
}
