"use client";

import { type FormEvent, useEffect, useState } from "react";

interface DimensionResult {
  score: number;
  evidence: string[];
  reason: string;
}

interface ScoreResponse {
  article: {
    title: string;
    canonicalUrl: string;
    contentType: "article" | "answer";
    author?: string;
    authorContext?: {
      headline?: string;
      badges: string[];
      topicExpertise: string[];
    };
    publishedAt?: string;
    sourceCharacterCount: number;
    sampledCharacterCount: number;
    embeddedImageCount: number;
    truncated: boolean;
    textSource:
      | "app_view"
      | "answer_page"
      | "open_platform_search"
      | "article_reader_fallback"
      | "manual";
  };
  baseline: {
    question: string;
    genericPoints: string[];
    researchMode: "deepseek_web_search" | "zhihu_global_search_fallback";
  };
  baselineComparison: {
    reconstructablePercentage: number;
    reconstructablePoints: string[];
    presentationOnlyPoints: string[];
    incrementalPoints: string[];
    genericAiStyleSignals: string[];
    informationGainCeiling: number;
    originalityCeiling: number;
    reason: string;
  };
  publicReaction?: {
    voteUpCount: number;
    commentCount: number;
    visibleComments: string[];
    interactionSignalScore: number;
    source: "zhihu_open_platform_search";
  };
  evaluation: {
    contentProfile: {
      primaryArchetype:
        | "technical_scientific"
        | "social_commentary"
        | "personal_experience"
        | "historical_narrative"
        | "news_report"
        | "entertainment_culture"
        | "other";
      effortScore: number;
      effortSignals: string[];
      effortLimitations: string[];
    };
    evidenceAndTruthfulness: DimensionResult & {
      verifiedSources: string[];
      unsupportedClaims: string[];
      comparisonChecks: string[];
    };
    practiceAndExperience: DimensionResult & {
      practiceSignals: string[];
      tacitExperienceSignals: string[];
      genericExperience: string[];
    };
    informationGainAndDepth: DimensionResult & {
      beyondBaseline: string[];
      overlapsBaseline: string[];
    };
    professionalismAndOriginality: DimensionResult & {
      domainSignals: string[];
      originalInsights: string[];
      technicalProblems: string[];
      boundaryAwareness: string[];
    };
    commercialIndependence: DimensionResult & {
      promotionalSignals: string[];
      contentFarmSignals: string[];
    };
    timelinessValue: DimensionResult & { timeSensitive: boolean; freshnessBasis: string };
    publicReception: DimensionResult & {
      commentObservationScore: number;
      interactionSignalScore: number;
      positiveObservations: string[];
      criticalObservations: string[];
      sampleLimitations: string[];
    };
    factualProblems: Array<{
      severity: "minor" | "major";
      problem: string;
      basis: string;
      contradictingEvidence: string[];
    }>;
    flags?: Array<
      "PURE_LEAD_GENERATION" | "FAKE_OR_INVALID_CITATION" | "UNSUPPORTED_DEEP_COMPARISON"
    >;
    confidence: number;
    summary: string;
  };
  score: {
    finalScore: number;
    uncappedScore: number;
    decision: "excellent" | "retain" | "low_value" | "reject";
    appliedCap: number | null;
    capReasons: string[];
    commercialDeduction: number;
    modelFinalScore?: number;
    humanCalibration?: {
      minimum: number;
      maximum: number;
      recordedAt?: string;
    };
  };
  verification: {
    questionContextIncluded: boolean;
    externalEvidenceCount: number;
    externalSearchAvailable: boolean;
  };
}

interface ScoreHistoryEntry {
  savedAt: string;
  result: ScoreResponse;
}

function Notification({ message, onClose }: { message: string; onClose: () => void }) {
  return (
    <div className="notification" role="alert" aria-live="assertive">
      <span>{message}</span>
      <button type="button" onClick={onClose} aria-label="关闭提示">
        ×
      </button>
    </div>
  );
}

const SCORE_HISTORY_KEY = "zhihu-juejin.score-history.v7";
const LEGACY_SCORE_HISTORY_KEYS = [
  "zhihu-juejin.score-history.v1",
  "zhihu-juejin.score-history.v2",
  "zhihu-juejin.score-history.v3",
  "zhihu-juejin.score-history.v4",
  "zhihu-juejin.score-history.v5",
  "zhihu-juejin.score-history.v6",
] as const;

function isScoreHistoryEntry(value: unknown): value is ScoreHistoryEntry {
  if (!value || typeof value !== "object") {
    return false;
  }
  const candidate = value as Partial<ScoreHistoryEntry>;
  const evaluation = candidate.result?.evaluation;
  return (
    typeof candidate.savedAt === "string" &&
    typeof candidate.result?.article?.title === "string" &&
    typeof candidate.result?.score?.finalScore === "number" &&
    typeof candidate.result?.baselineComparison?.reconstructablePercentage === "number" &&
    typeof candidate.result?.baseline?.researchMode === "string" &&
    Boolean(evaluation) &&
    dimensions.every((dimension) => typeof evaluation?.[dimension.key]?.score === "number")
  );
}

const dimensions = [
  { key: "evidenceAndTruthfulness", label: "证据和真实性", weight: "25%" },
  { key: "practiceAndExperience", label: "实践与经验", weight: "15%" },
  { key: "informationGainAndDepth", label: "信息增量与深度", weight: "25%" },
  { key: "professionalismAndOriginality", label: "专业与原创", weight: "15%" },
  { key: "timelinessValue", label: "时效价值", weight: "10%" },
  { key: "publicReception", label: "舆论氛围", weight: "10%" },
] as const;

const decisionLabels = {
  excellent: "精品",
  retain: "值得保留",
  low_value: "低价值",
  reject: "淘汰",
} as const;

const archetypeLabels = {
  technical_scientific: "技术与科学",
  social_commentary: "社会评论",
  personal_experience: "个人经历",
  historical_narrative: "人物与历史梳理",
  news_report: "新闻与时事",
  entertainment_culture: "娱乐与文化",
  other: "综合内容",
} as const;

export function ScoreWorkbench() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notification, setNotification] = useState("");
  const [needsText, setNeedsText] = useState(false);
  const [articleText, setArticleText] = useState("");
  const [result, setResult] = useState<ScoreResponse | null>(null);
  const [history, setHistory] = useState<ScoreHistoryEntry[]>([]);

  useEffect(() => {
    for (const legacyKey of LEGACY_SCORE_HISTORY_KEYS) {
      localStorage.removeItem(legacyKey);
    }
    const saved = localStorage.getItem(SCORE_HISTORY_KEY);
    if (!saved) {
      return;
    }
    try {
      const decoded: unknown = JSON.parse(saved);
      if (Array.isArray(decoded)) {
        setHistory(decoded.filter(isScoreHistoryEntry).slice(0, 10));
      }
    } catch (error) {
      if (!(error instanceof SyntaxError)) {
        throw error;
      }
    }
  }, []);

  useEffect(() => {
    if (!notification) {
      return;
    }
    const timeout = window.setTimeout(() => setNotification(""), 6_000);
    return () => window.clearTimeout(timeout);
  }, [notification]);

  function saveToHistory(scoreResult: ScoreResponse) {
    const entry = { savedAt: new Date().toISOString(), result: scoreResult };
    setHistory((current) => {
      const next = [
        entry,
        ...current.filter(
          (item) => item.result.article.canonicalUrl !== scoreResult.article.canonicalUrl,
        ),
      ].slice(0, 10);
      localStorage.setItem(SCORE_HISTORY_KEY, JSON.stringify(next));
      return next;
    });
  }

  async function runScore(targetUrl: string, suppliedText = "") {
    if (loading) {
      return;
    }
    setUrl(targetUrl);
    setArticleText(suppliedText);
    setLoading(true);
    setError("");
    setNotification("");
    setResult(null);
    try {
      const response = await fetch("/api/score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: targetUrl,
          ...(suppliedText.trim() ? { text: suppliedText } : {}),
        }),
      });
      const payload = (await response.json()) as
        | ScoreResponse
        | { error: string; code?: string; requiresText?: boolean };
      if (!response.ok || "error" in payload) {
        if ("error" in payload && payload.code === "DEEPSEEK_REQUEST_LIMIT") {
          setNotification("请求量过多，请稍后重试");
          return;
        }
        if ("error" in payload && payload.requiresText) {
          setNeedsText(true);
        }
        throw new Error("error" in payload ? payload.error : "评分失败");
      }
      setNeedsText(false);
      setResult(payload);
      saveToHistory(payload);
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : "评分失败");
    } finally {
      setLoading(false);
    }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void runScore(url, articleText);
  }

  function rerunScore(scoreResult: ScoreResponse) {
    void runScore(scoreResult.article.canonicalUrl);
  }

  return (
    <>
      {notification ? (
        <Notification message={notification} onClose={() => setNotification("")} />
      ) : null}
      <section className="scoring-hero">
        <div className="hero-copy">
          <p className="kicker">ARTICLE QUALITY LAB</p>
          <h2>
            拒绝垃圾信息，
            <br />
            重新评估知识价值。
          </h2>
          <p className="description">
            帮助你发现经过实践检验或专业经验支持的、具有独立判断且 AI
            无法轻易生成的知识。从证据、经验、深度、专业原创、时效和舆论氛围六个维度进行判断。
          </p>
        </div>

        <form className="score-form" onSubmit={submit}>
          <label htmlFor="article-url">知乎文章、回答链接或完整分享文本</label>
          <div className="input-shell">
            <input
              id="article-url"
              type="text"
              required
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              placeholder="直接粘贴：标题 - 作者的回答 - 知乎 https://www.zhihu.com/..."
              aria-describedby="url-help"
            />
            <button type="submit" disabled={loading}>
              {loading ? "正在盲测评分…" : "开始评分"}
            </button>
          </div>
          <p id="url-help">
            会自动提取分享文本中的链接；支持知乎专栏文章与问题回答。专栏正文不足时会自动尝试备用全文读取，评分通常需要几十秒。
          </p>
          {needsText ? (
            <div className="text-fallback">
              <label htmlFor="article-text">补充内容正文</label>
              <textarea
                id="article-text"
                value={articleText}
                onChange={(event) => setArticleText(event.target.value)}
                placeholder="知乎没有返回足够正文。请复制至少 1500 字；长文会取开头 2000 字与结尾 2000 字，合计 4000 字。"
                minLength={1_500}
              />
            </div>
          ) : null}
          {error ? (
            <div className="form-error" role="alert">
              {error}
            </div>
          ) : null}
          {loading ? (
            <div className="progress" role="progressbar" aria-label="正在评分">
              <span />
            </div>
          ) : null}
        </form>
      </section>

      {history.length > 0 ? (
        <section className="history-section" aria-label="最近评分记录">
          <div className="section-heading history-heading">
            <div>
              <p className="kicker">RECENT REPORTS</p>
              <h2>最近评分</h2>
            </div>
            <span>本机浏览器 · 最近 10 条</span>
          </div>
          <div className="history-list">
            {history.map((entry) => (
              <div
                className="history-row"
                key={`${entry.result.article.canonicalUrl}-${entry.savedAt}`}
              >
                <button
                  className="history-open"
                  type="button"
                  onClick={() => setResult(entry.result)}
                >
                  <span>
                    <strong>{entry.result.article.title}</strong>
                    <small>{new Date(entry.savedAt).toLocaleString("zh-CN")}</small>
                  </span>
                  <em>{entry.result.score.finalScore.toFixed(1)}</em>
                </button>
                <button
                  className="history-rerun"
                  type="button"
                  disabled={loading}
                  onClick={() => rerunScore(entry.result)}
                >
                  重新评分
                </button>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {result ? (
        <section className="result-section" aria-live="polite">
          <div className="result-head">
            <div>
              <p className="kicker">QUALITY REPORT</p>
              <h2>{result.article.title}</h2>
              <p>
                {result.article.author ? `作者 ${result.article.author} · ` : ""}
                {result.article.authorContext?.topicExpertise.length
                  ? `${result.article.authorContext.topicExpertise.join("、")}领域身份已纳入弱佐证 · `
                  : ""}
                读取 {result.article.sampledCharacterCount.toLocaleString("zh-CN")} /{" "}
                {result.article.sourceCharacterCount.toLocaleString("zh-CN")} 字
                {result.article.truncated ? " · 已按规则截断" : " · 已读取全文"}
                {result.article.embeddedImageCount > 0
                  ? ` · 内嵌图片 ${result.article.embeddedImageCount} 张`
                  : ""}
                {result.article.textSource === "open_platform_search"
                  ? " · 开放平台可见文本"
                  : result.article.textSource === "article_reader_fallback"
                    ? " · 专栏备用全文"
                    : result.article.textSource === "manual"
                      ? " · 用户补充正文"
                      : result.article.textSource === "answer_page"
                        ? " · 回答页完整正文"
                        : " · 页面可见文本"}
                {result.verification.questionContextIncluded ? " · 已纳入问题背景" : ""}
                {result.verification.externalSearchAvailable
                  ? ` · 外部核验 ${result.verification.externalEvidenceCount} 条`
                  : " · 外部核验暂不可用"}
              </p>
            </div>
            <div className="result-actions">
              <div className={`score-orb score-${result.score.decision}`}>
                <strong>{result.score.finalScore.toFixed(1)}</strong>
                <span>/ 10 · {decisionLabels[result.score.decision]}</span>
                {result.score.humanCalibration ? (
                  <span>
                    人工校准 {result.score.humanCalibration.minimum.toFixed(1)}—
                    {result.score.humanCalibration.maximum.toFixed(1)} · 模型原始{" "}
                    {result.score.modelFinalScore?.toFixed(1)}
                  </span>
                ) : null}
              </div>
              <button
                className="rerun-button"
                type="button"
                disabled={loading}
                onClick={() => rerunScore(result)}
              >
                {loading ? "正在重新评分…" : "重新评分此链接"}
              </button>
            </div>
          </div>

          <div className="dimension-grid">
            {dimensions.map(({ key, label, weight }) => {
              const dimension = result.evaluation[key];
              return (
                <article className="dimension-card" key={key}>
                  <div className="dimension-top">
                    <span>{label}</span>
                    <em>权重 {weight}</em>
                  </div>
                  <strong>{dimension.score.toFixed(1)}</strong>
                  <div className="score-track">
                    <span style={{ width: `${dimension.score * 10}%` }} />
                  </div>
                  <p>{dimension.reason}</p>
                  {dimension.evidence.length > 0 ? (
                    <ul>
                      {dimension.evidence.slice(0, 3).map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  ) : null}
                </article>
              );
            })}
          </div>

          <div className="analysis-grid">
            <article className="analysis-card">
              <p className="kicker">BLIND AI BASELINE</p>
              <h3>{result.baseline.question}</h3>
              <div className="signal-list">
                <strong>基线资料来源</strong>
                {result.baseline.researchMode === "deepseek_web_search"
                  ? "DeepSeek 原生 Web Search"
                  : "知乎全网搜索 fallback"}
              </div>
              <div className="effort-profile">
                <span>联网盲基线可重建比例</span>
                <strong>{result.baselineComparison.reconstructablePercentage}%</strong>
              </div>
              <p>{result.baselineComparison.reason}</p>
              {result.baselineComparison.genericAiStyleSignals.length > 0 ? (
                <div className="signal-list">
                  <strong>同质化表达风险</strong>
                  {result.baselineComparison.genericAiStyleSignals.join("；")}
                </div>
              ) : null}
              <h4>独立对比确认的信息增量</h4>
              <ul>
                {result.baselineComparison.incrementalPoints.length > 0 ? (
                  result.baselineComparison.incrementalPoints.map((item) => (
                    <li key={item}>{item}</li>
                  ))
                ) : (
                  <li>没有识别到明确的信息增量</li>
                )}
              </ul>
            </article>
            <article className="analysis-card verdict-card">
              <p className="kicker">EDITORIAL VERDICT</p>
              <h3>{result.evaluation.summary}</h3>
              <div className="effort-profile">
                <span>
                  {archetypeLabels[result.evaluation.contentProfile.primaryArchetype]} · 工作量
                </span>
                <strong>{result.evaluation.contentProfile.effortScore.toFixed(1)} / 10</strong>
              </div>
              <div className="confidence">
                <span>判断置信度</span>
                <strong>{result.evaluation.confidence}%</strong>
              </div>
              {result.evaluation.flags?.includes("PURE_LEAD_GENERATION") ||
              result.score.commercialDeduction > 0 ? (
                <div className="cap-note">
                  <strong>检测到商业推广</strong>
                </div>
              ) : null}
              <div className="signal-list">
                <strong>舆论样本</strong>
                {result.publicReaction
                  ? `赞同 ${result.publicReaction.voteUpCount} · 评论 ${result.publicReaction.commentCount} · 可见评论样本 ${result.publicReaction.visibleComments.length} 条`
                  : "未取得开放平台互动数据，按中性处理"}
              </div>
            </article>
          </div>
        </section>
      ) : null}
    </>
  );
}
