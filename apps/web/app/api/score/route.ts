import {
  readZhihuArticle,
  sampleArticleText,
  ZhihuArticleReadError,
} from "@zhihu-juejin/content-pipeline";
import {
  applyBaselineComparisonLimits,
  applyPublicReceptionComposition,
  compareArticleAgainstBaseline,
  DeepSeekClient,
  DeepSeekHttpError,
  type DeepSeekModel,
  evaluateArticleQuality,
  generateBlindBaselineWithFallback,
  type VerificationEvidence,
} from "@zhihu-juejin/llm-evaluator";
import {
  applyHumanScoreCalibration,
  calculateArticleScore,
  humanCalibrationCases,
} from "@zhihu-juejin/quality-pipeline";
import { ZhihuClient } from "@zhihu-juejin/zhihu-client";
import { NextResponse } from "next/server";
import { looksLikeTargetContent } from "./baseline-source-filter";

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

function createZhihuSearchClient(): ZhihuClient | undefined {
  const accessSecret = process.env.ZHIHU_ACCESS_SECRET?.trim();
  if (accessSecret) {
    return new ZhihuClient({
      accessSecret,
      ...(process.env.ZHIHU_API_BASE_URL ? { baseUrl: process.env.ZHIHU_API_BASE_URL } : {}),
    });
  }
  return undefined;
}

async function collectVerificationEvidence(
  client: ZhihuClient | undefined,
  query: string,
): Promise<VerificationEvidence[] | undefined> {
  if (!client) {
    return undefined;
  }
  try {
    const result = await client.searchGlobal({ query, count: 20, searchDb: "all" });
    return result.items
      .filter((item) => {
        try {
          const hostname = new URL(item.Url).hostname.toLowerCase();
          return hostname !== "zhihu.com" && !hostname.endsWith(".zhihu.com");
        } catch {
          return false;
        }
      })
      .filter((item) => !looksLikeTargetContent(item.Title, query))
      .slice(0, 8)
      .map((item) => ({
        title: item.Title,
        url: item.Url,
        excerpt: item.ContentText.slice(0, 1_500),
        ...(item.AuthorityLevel ? { authorityLevel: item.AuthorityLevel } : {}),
      }));
  } catch (error) {
    if (error instanceof Error) {
      return undefined;
    }
    throw error;
  }
}

function calculateInteractionSignalScore(voteUpCount: number, commentCount: number): number {
  const weakPopularitySignal =
    5 + Math.log10(voteUpCount + 1) * 0.65 + Math.log10(commentCount + 1) * 0.35;
  return Math.round(Math.min(8, weakPopularitySignal) * 2) / 2;
}

async function collectPublicReaction(
  client: ZhihuClient | undefined,
  title: string,
  sourceContentId: string,
) {
  if (!client) {
    return undefined;
  }
  try {
    const result = await client.searchZhihu({ query: title, count: 10 });
    const item = result.items.find(
      (candidate) =>
        candidate.ContentID === sourceContentId || candidate.Url.includes(sourceContentId),
    );
    if (!item) {
      return undefined;
    }
    return {
      voteUpCount: item.VoteUpCount,
      commentCount: item.CommentCount,
      visibleComments: (item.CommentInfoList ?? [])
        .map((comment) => comment.Content.trim())
        .filter(Boolean)
        .slice(0, 10),
      interactionSignalScore: calculateInteractionSignalScore(item.VoteUpCount, item.CommentCount),
      source: "zhihu_open_platform_search" as const,
    };
  } catch {
    return undefined;
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
    const [verificationEvidence, publicReaction] = await Promise.all([
      collectVerificationEvidence(searchClient, article.title),
      collectPublicReaction(searchClient, article.title, article.sourceContentId),
    ]);
    const { baseline, researchMode: baselineResearchMode } =
      await generateBlindBaselineWithFallback(client, {
        title: article.title,
        ...(article.questionContext ? { questionContext: article.questionContext.text } : {}),
        ...(verificationEvidence ? { verificationEvidence } : {}),
      });
    const baselineComparison = await compareArticleAgainstBaseline(client, {
      title: article.title,
      text: evaluationText,
      baseline,
      ...(verificationEvidence ? { verificationEvidence } : {}),
    });
    const wasTruncated = suppliedText.length > 4_000 || article.truncated;
    const rawEvaluation = await evaluateArticleQuality(client, {
      title: article.title,
      text: evaluationText,
      canonicalUrl: article.canonicalUrl,
      citations: article.citations,
      baseline,
      baselineComparison,
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
      ...(publicReaction ? { publicReaction } : {}),
    });
    const evaluation = applyPublicReceptionComposition(
      applyBaselineComparisonLimits(rawEvaluation, baselineComparison),
      publicReaction,
    );
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
      publicReaction,
      baseline: {
        question: baseline.question,
        genericPoints: baseline.genericPoints,
        researchMode: baselineResearchMode,
      },
      baselineComparison,
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
