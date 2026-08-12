import type { DeepSeekClient } from "./client";
import {
  type ArticleQualityEvaluation,
  ArticleQualityEvaluationSchema,
  type BlindBaseline,
  BlindBaselineSchema,
  type FullQualityEvaluation,
  FullQualityEvaluationSchema,
  type PreviewTriage,
  PreviewTriageSchema,
} from "./schemas";

export interface BlindBaselineInput {
  title: string;
  questionContext?: string;
  evaluationDate?: string;
}

export interface VerificationEvidence {
  title: string;
  url: string;
  excerpt: string;
  authorityLevel?: string;
}

export interface ArticleAuthorContext {
  name?: string;
  headline?: string;
  badges: readonly string[];
  topicExpertise: readonly string[];
}

export interface ArticleQualityEvaluationInput {
  title: string;
  text: string;
  canonicalUrl: string;
  citations: readonly string[];
  baseline: BlindBaseline;
  questionContext?: {
    text: string;
    citations: readonly string[];
  };
  verificationEvidence?: readonly VerificationEvidence[];
  mediaEvidence?: {
    embeddedImageCount: number;
    imageUrls: readonly string[];
  };
  authorContext?: ArticleAuthorContext;
  sampling?: {
    truncated: boolean;
    headCharacters: number;
    tailCharacters: number;
  };
  publishedAt?: string;
  evaluationDate?: string;
}

const TEN_POINT_RUBRIC = `
所有维度均为 0 到 10 分，且只能使用 0.5 步进。

证据和真实性：10=关键事实均有可核验材料，数据、引用、人物、时间和方法彼此一致；7=主要事实有来源或能被外部检索交叉验证，仅少量次要论断缺证；4=没有已证实的事实错误，但关键观点缺少论证；0=胡说、关键错误、伪造证据或引用与论断冲突。技术与科学内容看论文、实验、数据和方法；社会评论看观察位置、具体案例、统计、历史材料、反例和因果链；人物与娱乐史料整理看人物身份、时间线、原帖或多来源是否相互印证；个人经历中的自身感受和事件经过通常是第一手材料，不要求外部论文证明。外部检索没有搜到只能记为“未核验”，绝不等于事实错误。只有可靠来源明确反驳正文时才可写 factualProblems，且 contradictingEvidence 必须列出具体冲突证据。SOTA 只在内容主动声称最新、最佳、领先或横评时检查。
实践与经验：本维度也衡量“获得一手材料所投入的劳动”。10=详细实验、操作、田野观察、长期经验或系统搜集核对大量史料，包含过程、失败、调整和边界；7=有清楚可见的真人投入，并且展开了与核心问题直接相关的行动、选择、变化、失败或反思；4=有第一人称或搜集痕迹，但内容零散、基本是常识、只报结论，或没有展开选择与变化过程；0=经验虚构、洗稿或没有可识别的人工投入。真实经历本身证明原创和 effort，但不能自动得到 7 分以上；必须检查细节密度、心理或决策变化、可迁移认识和对读者的参考价值。细节必须服务于题目核心：例如回答“如何度过困境”时，只详述困境起因、医学里程碑或情绪痛苦，却没有展开如何应对、决策怎样变化和哪些尝试有效，实践与经验通常不应超过 5.5。
信息增量与深度：10=显著降低读者理解成本，提供基线无法得到的关键事实、完整脉络、过程、推导或判断；7=有多项实质增量，足以让陌生读者理解事件全貌或获得可迁移认识；4=观点或经历虽真实，但信息零散、基本等同常规 AI 回答或一句话判断的扩写；0=没有信息或比基线更差。独特不等于有用：私人细节只有在帮助理解选择、因果、处境或方法时才转化为价值。广度、术语和列表也不等于深度。必须把可读性纳入本维度：专业术语如果缺少定义、因果连接或面向读者的解释，会提高理解成本而非增加深度；人物稿如果只是按履历和研究方向顺序转述，也不能因为覆盖面完整就得到 7 分。
专业与原创：10=准确掌握对象、机制、边界和不确定性，并提出基线不易生成的独立框架、犀利判断或高质量叙事整合；7=专业或对象知识可靠，有明确个人视角，或把分散材料组织成有解释力的历史脉络；4=比喻或观点看似新颖，但主要模式是“X 就是 Y”的武断类比，没有观察依据、案例、因果链或反例，或者仅停留在常识复述；0=根本性误解、伪专业推理或洗稿拼接。人文、生活和娱乐内容不要求技术术语，“专业”表现为真正了解人物、事件、文化语境或生活处境。尖锐、反共识、有情绪甚至带贬义修辞的观点，只要推理受知识支持，就是原创正向信号；严禁仅凭语气扣分。可核验的领域身份只能帮助解释经验来源，不能直接换分，也不能抵消正文错误。术语准确只证明专业性，不证明原创性；若正文主要是公开履历、论文摘要、机构报道和受访者陈述的顺序转述，且外部检索或盲测基线可轻易重建大部分内容，就应降低本维度。采访本身只证明工作量，必须产生公开资料难以替代的事实、判断、追问或解释，才能形成高原创分。
商业独立性：10=没有刻意广告、引流、起号或利益诱导，也没有用平庸洗稿为商业账号蓄水；7=有品牌/产品效果宣传但判断基本独立；4=暗示某商业产品效果优越、轻度软文或利益关系不透明，但没有明确行动召唤；0=明显商业推广、卖课、导流、邀请码、下载入口、反复宣传自有社群或服务、虚构变现、洗稿起号。仅仅点名、讨论或批评公司和产品不算“产品露出”，不能扣分；情绪、讽刺、立场鲜明、批评公司或赞美非商业对象也都不是推广信号。如果 promotionalSignals 与 contentFarmSignals 都为空，本维度必须为 10 分；出现明确下载、加群、邀请码、购买或关注行动召唤时，本维度必须为 0，并设置 PURE_LEAD_GENERATION。此维度越高越好。
时效价值：10=对时效敏感且包含非常新的、已经核对日期的信息；7=较新且仍有现实价值；5=内容不依赖时效或时间中性；2=时效型内容明显落后；0=把严重过时的信息当作当前事实。新闻足够新可以获得加分，数学、历史等非时效内容不得因为年代久自动扣分。

工作量是跨领域共同尺度：查证与交叉验证、对比实验、亲身实践、踩坑、访谈、长期观察、原创推理、搜集时间线以及把杂乱材料组织成易懂叙事，都属于工作量。字数多、情绪强、术语多、排版工整和编造具体细节不代表工作量。contentProfile.effortScore 只评价可从正文识别的有效劳动；最终质量还要检查这些劳动是否转化成可信且对读者有用的信息。
对于人物、历史或娱乐事件梳理，如果正文有明确人物身份、关系和时间线，并嵌入 10 张以上用于展示材料的图片，通常说明存在显著搜集和编辑劳动；在没有洗稿、装饰图滥用或前后矛盾信号时，effortScore 和实践与经验原则上不低于 7。图片数量不能单独提高证据真实性，真实性仍取决于文本、外部核验和未来的图片内容识别。

人工校准锚点：
- 4 分社会评论：有新颖比喻或强烈观点，但作者没有展示相关经历或知识位置，也没有案例、材料和推理链，基本模式是“X 就是 Y”。
- 5.5—6 分个人经历：经历可信，确认有原创价值和人工投入，但叙述零散、心路与选择过程没有充分展开，可迁移参考价值不高。
- 6—6.5 分专业评论：篇幅不长、对外行解释有限，但能准确调用领域知识和隐性经验，形成有根据的独立判断。
- 7.5 分人物或娱乐史料整理：系统搜集人物与事件历史，给出清楚时间线和充足证据，使完全不了解事件的读者也能掌握全貌；整理本身就是高价值原创劳动，不要求额外学术理论。
`.trim();

export async function generateBlindBaseline(
  client: DeepSeekClient,
  input: BlindBaselineInput,
): Promise<BlindBaseline> {
  return client.completeJson(BlindBaselineSchema, {
    thinking: false,
    maxTokens: 1_400,
    system:
      "你是独立基线回答器。你不会看到待评分文章、作者、正文或文章中的引用。请只根据题目独立给出一份常规但可靠的 AI 回答，用于之后检测文章是否有信息增量。只输出 JSON。",
    user: JSON.stringify({
      task: "根据问题标题和可选的问题描述，归纳一个中性的核心问题并独立回答。问题描述是所有回答者都能看到的公共前提，不属于待评分回答的信息增量。不要假设你看过对应回答。",
      title: input.title,
      questionContext: input.questionContext,
      evaluationDate: input.evaluationDate ?? new Date().toISOString().slice(0, 10),
      jsonSchema: BlindBaselineSchema,
    }),
  });
}

export async function evaluateArticleQuality(
  client: DeepSeekClient,
  input: ArticleQualityEvaluationInput,
): Promise<ArticleQualityEvaluation> {
  if (!input.text.trim()) {
    throw new TypeError("Article quality evaluation requires non-empty text");
  }
  return client.completeJson(ArticleQualityEvaluationSchema, {
    thinking: false,
    maxTokens: 4_000,
    temperature: 0,
    system: `你是知乎掘金的内容评分器。依据给定正文样本、问题上下文、独立生成的盲测基线、可见引用和外部检索证据判断。不得使用点赞数、粉丝量或作者名气。先为 contentProfile 选择最贴近正文价值来源的内容类型，再使用对应证据标准；不要拿技术论文模板评判生活经历、人物史料或社会评论。问题描述是回答的公共上下文：其中已经给出的事实和来源不能被误判为回答缺少出处，但也不能当作回答自己的信息增量。外部检索若能直接支持一个常见事实，就把它视为已核验；搜索未召回、没有找到或暂时无法验证，不构成事实错误。只有明确的相反证据才能产生 factualProblems；major 问题必须在 contradictingEvidence 中写出可核查的冲突证据，否则禁止标为 major。mediaEvidence 表示正文实际嵌入的图片或截图：图片数量可证明作者进行了材料展示和编辑投入，尤其对人物史料、娱乐事件和教程有意义；但你没有看到图片像素，不能编造图片内容，也不能仅凭图片数量断言某个事实已经核验。评论与解释性文章可以依靠逻辑链、领域惯例和经验判断论证价值，但纯粹的武断类比不是专业直觉。修辞、讽刺、价值判断和经验性概括不属于可直接判错的事实。作者资料只能作为判断经验来源的弱证据，不能自动加分或覆盖正文错误。每个分数必须引用正文具体证据；无法验证时降低置信度，不得编造核验结果。每个数组最多填写 3 条，每条保持简短。${TEN_POINT_RUBRIC}\n只输出 JSON。`,
    user: JSON.stringify({
      task: "先判断内容类型和有效工作量，再按六个维度评分。盲测基线没有看到待评分正文、作者资料和引用。区分问题前提、事实论断、个人经历、资料整理、专业经验判断和外部核验结果；评价工作量是否真正转化成可信、有用、难以替代的知识。对于人物与科技报道，额外检查公开检索是否足以重建正文大部分信息，以及采访是否真正产生了不可替代的材料；不要把术语数量、准确转述或履历流水账误当成原创洞见。",
      evaluationDate: input.evaluationDate ?? new Date().toISOString().slice(0, 10),
      article: {
        title: input.title,
        canonicalUrl: input.canonicalUrl,
        publishedAt: input.publishedAt,
        text: input.text,
        citations: input.citations,
        sampling: input.sampling,
      },
      questionContext: input.questionContext,
      verificationEvidence: input.verificationEvidence,
      mediaEvidence: input.mediaEvidence,
      authorContext: input.authorContext,
      blindBaseline: input.baseline,
      jsonSchema: ArticleQualityEvaluationSchema,
    }),
  });
}

export interface PreviewTriageInput {
  title: string;
  excerpt: string;
  candidateTopicIds: readonly string[];
  riskSignals?: readonly string[];
  frontierBaseline?: FrontierBaseline;
}

export interface FrontierBaseline {
  asOf: string;
  referencePoints: readonly string[];
}

export interface FullQualityEvaluationInput {
  title: string;
  fullText: string;
  candidateTopicIds: readonly string[];
  comparisonSnippets: readonly string[];
  genericAnswerBaseline?: string;
  evaluationDate?: string;
  frontierBaseline?: FrontierBaseline;
}

const SHARED_RUBRIC = `
质量原则：
1. 正确但显而易见的观点没有信息增量。若文章主要在说服读者接受“AI 很重要、Agent 会流行、效率会提升”等常识，却没有新机制、新证据或反常识结论，thesisNovelty 和 informationGain 必须低。
2. 广度、术语数量、工具列表和结构完整不等于深度。寻找可复现方法、对照、数据来源、失败条件、成本、限制或作者独有判断。
3. 对“最新、趋势、拐点、工具推荐、行业全景”的内容，发布时间新不代表内容新。检查其是否理解当期主流前沿系统、真实采用情况和关键竞争格局；用过时或边缘案例支撑宏大结论时，frontierAwareness 必须低。
4. 个人筛选框架是正向信号，但只有当它产生了非显然选择、反例、淘汰依据或不易搜索到的洞见时才构成价值。
5. 赚钱或商业案例必须提供可核验的市场需求、获客方式、客户或样本、成本、收入、时间线、失败和踩坑。仅给出“执行这些步骤就能变现”的路径，marketingRisk 必须高，claimVerifiability 必须低。
6. AI 生成与否不能仅凭文风定罪。genericAiStyleRisk 只衡量套话、对称结构、空泛转折、无作者特异证据等“通用 AI 风格风险”，不得声称已证明由 AI 生成。
7. 区分“个人项目复盘”和“普遍性结论”。个人复盘没有 SOTA 对照仍可有较高第一手价值，但其结论不能无依据外推；声称“深度横评、全景、最佳方案”的文章必须给出版本、来源、方法和对照组。
8. 阅读体验属于质量。术语堆砌、缺少上下文、排版随意、承诺的附录或资源链接缺失，应降低 readability、sourceTraceability 或 practicalSpecificity，但不能抹掉真实独有经验。
9. 不得使用点赞量或作者名气作为质量依据。标题中的“普通人、变现、All-in、SOP、风口、保姆级、领取、私信”等是营销风险信号；摘要声称有数据不等于证据可靠，也不能自动抵消营销风险。

人工金标形成的分数锚点：
- 8 分：有大量个人踩坑、过程和原创细节，参考价值明显；即使缺少 SOTA 对照也仍然值得保留。
- 7 分：有严格实验、对照组或完整工程复盘，证据清楚；可以存在轻微广告味、AI 文案味或表达问题。
- 6 至 6.5 分：内容较新且有实用广度，或有独立实践经验；但深度、排版、可读性或洞见明显不足。
- 4 分：没有明显胡说，但所谓“深度/全景”实际泛泛、引用和判断无出处、时效性难验证。
- 2 分：产品软文，没有 SOTA 对比，使用过时工具，且缺乏足够细节。
- 0 分：纯卖课、导流或情绪营销，没有可保留的信息价值。

只输出 JSON，不要 Markdown。
`.trim();

export async function triageContentPreview(
  client: DeepSeekClient,
  input: PreviewTriageInput,
): Promise<PreviewTriage> {
  return client.completeJson(PreviewTriageSchema, {
    thinking: false,
    maxTokens: 1_200,
    system: `你是知乎掘金的内容召回初筛器。你看到的只有搜索摘要，不是完整正文。${SHARED_RUBRIC}`,
    user: JSON.stringify({
      task: "只依据标题和搜索摘要做保守初筛。重点判断论点是否只是常识包装、证据是否具体、是否理解当前前沿、是否有第一手信号，以及是否值得继续获取全文。必须按人工金标锚点校准各维度，但不要把摘要分当作最终文章分。",
      requiredOutput: {
        contentCoverage: "summary",
        jsonSchema: PreviewTriageSchema,
      },
      content: input,
    }),
  });
}

export async function evaluateFullContent(
  client: DeepSeekClient,
  input: FullQualityEvaluationInput,
): Promise<FullQualityEvaluation> {
  if (!input.fullText.trim()) {
    throw new TypeError("Full quality evaluation requires non-empty full text");
  }

  return client.completeJson(FullQualityEvaluationSchema, {
    thinking: true,
    reasoningEffort: "high",
    maxTokens: 3_000,
    system: `你是知乎掘金的文章质量评估器。你必须依据完整正文中的具体信息做判断。${SHARED_RUBRIC}`,
    user: JSON.stringify({
      task: "评估完整正文。每个高分都必须能由 supportingEvidence 中的具体证据支持。比较候选内容、相似内容、通用 AI 基线和可选的前沿基线，判断真正的信息增量。不能因为文章结构完整、术语多或结论正确就判为高质量。",
      requiredOutput: {
        contentCoverage: "full",
        jsonSchema: FullQualityEvaluationSchema,
      },
      content: {
        ...input,
        evaluationDate: input.evaluationDate ?? new Date().toISOString().slice(0, 10),
      },
    }),
  });
}
