import { existsSync } from "node:fs";
import { join } from "node:path";
import {
  readZhihuArticle,
  sampleArticleText,
  ZhihuArticleReadError,
} from "@zhihu-juejin/content-pipeline";
import {
  DeepSeekClient,
  DeepSeekHttpError,
  type DeepSeekModel,
  evaluateArticleQuality,
  generateBlindBaseline,
  type VerificationEvidence,
} from "@zhihu-juejin/llm-evaluator";
import {
  applyHumanScoreCalibration,
  calculateArticleScore,
  humanCalibrationCases,
} from "@zhihu-juejin/quality-pipeline";
import { ZhihuCliClient, ZhihuClient } from "@zhihu-juejin/zhihu-client";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

function createDeepSeekClient(): DeepSeekClient {
  const apiKey = process.env.DEEPSEEK_API_KEY?.trim() || process.env.APIKEY?.trim();
  if (!apiKey) {
    throw new Error("DEEPSEEK_API_KEY is not configured");
  }
  const model = process.env.DEEPSEEK_MODEL ?? "deepseek-v4-flash";
  if (model !== "deepseek-v4-flash" && model !== "deepseek-v4-pro") {
    throw new Error("DEEPSEEK_MODEL is invalid");
  }
  return new DeepSeekClient({
    apiKey,
    model: model satisfies DeepSeekModel,
    timeoutMs: 120_000,
    ...(process.env.DEEPSEEK_API_BASE_URL ? { baseUrl: process.env.DEEPSEEK_API_BASE_URL } : {}),
  });
}

function createZhihuSearchClient(): ZhihuClient | ZhihuCliClient | undefined {
  const accessSecret = process.env.ZHIHU_ACCESS_SECRET?.trim();
  if (accessSecret) {
    return new ZhihuClient({
      accessSecret,
      ...(process.env.ZHIHU_API_BASE_URL ? { baseUrl: process.env.ZHIHU_API_BASE_URL } : {}),
    });
  }
  const configuredPath = process.env.ZHIHU_CLI_PATH?.trim();
  const localAppData = process.env.LOCALAPPDATA?.trim();
  const defaultPath = localAppData
    ? join(localAppData, "ZhihuCLI", "current", "zhihu-cli.exe")
    : undefined;
  const binaryPath =
    configuredPath || (defaultPath && existsSync(defaultPath) ? defaultPath : undefined);
  return binaryPath ? new ZhihuCliClient({ binaryPath }) : undefined;
}

async function collectVerificationEvidence(
  client: ZhihuClient | ZhihuCliClient | undefined,
  query: string,
): Promise<VerificationEvidence[] | undefined> {
  if (!client) {
    return undefined;
  }
  try {
    const result = await client.searchGlobal({ query, count: 6, searchDb: "all" });
    return result.items.slice(0, 6).map((item) => ({
      title: item.Title,
      url: item.Url,
      excerpt: item.ContentText.slice(0, 1_200),
      ...(item.AuthorityLevel ? { authorityLevel: item.AuthorityLevel } : {}),
    }));
  } catch (error) {
    if (error instanceof Error) {
      return undefined;
    }
    throw error;
  }
}

export async function POST(request: Request): Promise<Response> {
  let body: { url?: string; text?: string };
  try {
    body = (await request.json()) as { url?: string; text?: string };
  } catch {
    return NextResponse.json({ error: "请求格式无效" }, { status: 400 });
  }
  if (typeof body.url !== "string" || body.url.trim().length === 0) {
    return NextResponse.json({ error: "请输入知乎链接或完整分享文本" }, { status: 400 });
  }

  try {
    const searchClient = createZhihuSearchClient();
    const article = await readZhihuArticle(body.url, {
      searchClient,
      ...(process.env.ZHIHU_ARTICLE_READER_BASE_URL?.trim()
        ? { articleReaderBaseUrl: process.env.ZHIHU_ARTICLE_READER_BASE_URL.trim() }
        : {}),
    });
    const suppliedText = typeof body.text === "string" ? body.text.trim() : "";
    const evaluationText =
      suppliedText.length > article.text.length ? sampleArticleText(suppliedText) : article.text;
    const textSource = suppliedText.length > article.text.length ? "manual" : article.textSource;
    if (article.contentType === "article" && evaluationText.length < 1_500) {
      return NextResponse.json(
        {
          error: `知乎开放平台和专栏备用读取目前合计只取得 ${evaluationText.length} 字，覆盖不足，不能可靠评分。请粘贴正文后继续。`,
          code: "CONTENT_INCOMPLETE",
          requiresText: true,
          article: { title: article.title, availableCharacters: evaluationText.length },
        },
        { status: 422 },
      );
    }
    const client = createDeepSeekClient();
    const verificationEvidence = await collectVerificationEvidence(searchClient, article.title);
    const baseline = await generateBlindBaseline(client, {
      title: article.title,
      ...(article.questionContext ? { questionContext: article.questionContext.text } : {}),
    });
    const wasTruncated = suppliedText.length > 4_000 || article.truncated;
    const evaluation = await evaluateArticleQuality(client, {
      title: article.title,
      text: evaluationText,
      canonicalUrl: article.canonicalUrl,
      citations: article.citations,
      baseline,
      ...(article.questionContext ? { questionContext: article.questionContext } : {}),
      ...(verificationEvidence ? { verificationEvidence } : {}),
      ...(article.embeddedImages.length > 0
        ? {
            mediaEvidence: {
              embeddedImageCount: article.embeddedImages.length,
              imageUrls: article.embeddedImages,
            },
          }
        : {}),
      ...(article.authorContext ? { authorContext: article.authorContext } : {}),
      ...(wasTruncated
        ? { sampling: { truncated: true, headCharacters: 2_000, tailCharacters: 2_000 } }
        : {}),
      ...(article.publishedAt ? { publishedAt: article.publishedAt } : {}),
    });
    const modelScore = calculateArticleScore(evaluation);
    const calibration = humanCalibrationCases.find(
      (item) => item.canonicalUrl === article.canonicalUrl && item.humanScore !== undefined,
    );
    const score = calibration
      ? applyHumanScoreCalibration(modelScore, {
          score: calibration.humanScore ?? modelScore.finalScore,
          ...(calibration.humanScoreRange ? { range: calibration.humanScoreRange } : {}),
          ...(calibration.recordedAt ? { recordedAt: calibration.recordedAt } : {}),
        })
      : modelScore;

    return NextResponse.json({
      article: {
        title: article.title,
        canonicalUrl: article.canonicalUrl,
        contentType: article.contentType,
        author: article.author,
        authorContext: article.authorContext,
        publishedAt: article.publishedAt,
        sourceCharacterCount: Math.max(article.sourceCharacterCount, suppliedText.length),
        sampledCharacterCount: evaluationText.length,
        embeddedImageCount: article.embeddedImages.length,
        truncated: wasTruncated,
        textSource,
      },
      verification: {
        questionContextIncluded: Boolean(article.questionContext),
        externalEvidenceCount: verificationEvidence?.length ?? 0,
        externalSearchAvailable: verificationEvidence !== undefined,
      },
      baseline: {
        question: baseline.question,
        genericPoints: baseline.genericPoints,
      },
      evaluation,
      score,
    });
  } catch (error) {
    if (error instanceof ZhihuArticleReadError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: 422 });
    }
    if (error instanceof DeepSeekHttpError && (error.status === 402 || error.status === 429)) {
      return NextResponse.json(
        { error: "请求量过多，请稍后重试", code: "DEEPSEEK_REQUEST_LIMIT" },
        { status: 429 },
      );
    }
    const message = error instanceof Error ? error.message : "评分失败";
    return NextResponse.json(
      { error: message.includes("DEEPSEEK") ? "评分服务尚未配置" : "评分过程中发生错误" },
      { status: 500 },
    );
  }
}
