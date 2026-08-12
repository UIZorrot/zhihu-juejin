import { type Static, type TSchema, Type } from "@sinclair/typebox";
import { Value } from "@sinclair/typebox/value";

type FetchLike = (input: string | URL, init?: RequestInit) => Promise<Response>;
export type DeepSeekModel = "deepseek-v4-flash" | "deepseek-v4-pro";
export type ReasoningEffort = "low" | "high" | "max";

export interface DeepSeekClientOptions {
  apiKey: string;
  baseUrl?: string;
  model?: DeepSeekModel;
  fetch?: FetchLike;
  timeoutMs?: number;
}

export interface JsonCompletionOptions {
  system: string;
  user: string;
  thinking?: boolean;
  reasoningEffort?: ReasoningEffort;
  maxTokens?: number;
  temperature?: number;
}

const CompletionResponseSchema = Type.Object({
  id: Type.String(),
  model: Type.String(),
  choices: Type.Array(
    Type.Object({
      finish_reason: Type.Union([
        Type.Literal("stop"),
        Type.Literal("length"),
        Type.Literal("content_filter"),
        Type.Literal("insufficient_system_resource"),
      ]),
      message: Type.Object({
        content: Type.String(),
        role: Type.Literal("assistant"),
      }),
    }),
    { minItems: 1 },
  ),
  usage: Type.Optional(
    Type.Object({
      prompt_tokens: Type.Integer({ minimum: 0 }),
      completion_tokens: Type.Integer({ minimum: 0 }),
      total_tokens: Type.Integer({ minimum: 0 }),
    }),
  ),
});

export class DeepSeekProtocolError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DeepSeekProtocolError";
  }
}

export class DeepSeekHttpError extends Error {
  readonly status: number;

  constructor(status: number) {
    super(`DeepSeek request failed with HTTP ${status}`);
    this.name = "DeepSeekHttpError";
    this.status = status;
  }
}

export class DeepSeekClient {
  readonly #apiKey: string;
  readonly #baseUrl: string;
  readonly #model: DeepSeekModel;
  readonly #fetch: FetchLike;
  readonly #timeoutMs: number;

  constructor(options: DeepSeekClientOptions) {
    const apiKey = options.apiKey.trim();
    if (!apiKey) {
      throw new TypeError("DeepSeek API key is required");
    }
    this.#apiKey = apiKey;
    this.#baseUrl = (options.baseUrl ?? "https://api.deepseek.com").replace(/\/$/, "");
    this.#model = options.model ?? "deepseek-v4-flash";
    this.#fetch = options.fetch ?? fetch;
    this.#timeoutMs = options.timeoutMs ?? 60_000;
  }

  async completeJson<T extends TSchema>(
    schema: T,
    options: JsonCompletionOptions,
  ): Promise<Static<T>> {
    let repairInstruction = "";
    for (let attempt = 0; attempt < 2; attempt += 1) {
      const result = await this.#requestJson(options, repairInstruction);
      if (Value.Check(schema, result)) {
        return result as Static<T>;
      }

      const details = [...Value.Errors(schema, result)]
        .slice(0, 5)
        .map((error) => `${error.path || "/"}: ${error.message}`)
        .join("; ");
      if (attempt === 0) {
        repairInstruction = `上一次输出未通过 JSON Schema 校验：${details}。请重新生成完整对象；所有 required 字段都必须出现，且严格遵守字段类型。`;
        continue;
      }
      throw new DeepSeekProtocolError(
        `DeepSeek JSON Output did not match the evaluation schema${details ? ` (${details})` : ""}`,
      );
    }
    throw new DeepSeekProtocolError("DeepSeek JSON Output validation failed unexpectedly");
  }

  async #requestJson(options: JsonCompletionOptions, repairInstruction: string): Promise<unknown> {
    const response = await this.#fetch(`${this.#baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.#apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: this.#model,
        messages: [
          {
            role: "system",
            content: repairInstruction ? `${options.system}\n${repairInstruction}` : options.system,
          },
          { role: "user", content: options.user },
        ],
        thinking: { type: options.thinking === false ? "disabled" : "enabled" },
        reasoning_effort: options.reasoningEffort ?? "low",
        response_format: { type: "json_object" },
        max_tokens: options.maxTokens ?? 2_000,
        temperature: options.temperature ?? 0,
        stream: false,
      }),
      signal: AbortSignal.timeout(this.#timeoutMs),
    });

    const rawResponse = await response.text();
    if (!response.ok) {
      throw new DeepSeekHttpError(response.status);
    }

    let completion: unknown;
    try {
      completion = JSON.parse(rawResponse);
    } catch (error) {
      if (error instanceof SyntaxError) {
        throw new DeepSeekProtocolError("DeepSeek returned a non-JSON API response");
      }
      throw error;
    }

    if (!Value.Check(CompletionResponseSchema, completion)) {
      throw new DeepSeekProtocolError("DeepSeek completion did not match the API schema");
    }

    const choice = completion.choices[0];
    if (choice?.finish_reason !== "stop") {
      throw new DeepSeekProtocolError(
        `DeepSeek completion did not finish normally: ${choice?.finish_reason ?? "missing_choice"}`,
      );
    }

    let result: unknown;
    try {
      result = JSON.parse(choice.message.content);
    } catch (error) {
      if (error instanceof SyntaxError) {
        throw new DeepSeekProtocolError("DeepSeek JSON Output contained invalid JSON");
      }
      throw error;
    }

    return result;
  }
}
