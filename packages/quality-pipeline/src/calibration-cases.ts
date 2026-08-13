export interface HumanCalibrationCase {
  sourceContentId: string;
  canonicalUrl: string;
  title: string;
  authorName?: string;
  humanScore?: number;
  humanScoreRange?: {
    minimum: number;
    maximum: number;
  };
  humanDimensionScores?: {
    informationGainAndDepth?: number;
    professionalismAndOriginality?: number;
  };
  humanDimensionReasons?: {
    informationGainAndDepth?: string;
    professionalismAndOriginality?: string;
  };
  recordedAt?: string;
  expectedPreviewDecision?: "acquire_full_text" | "human_review" | "reject";
  expectedFullDecision?: "publish" | "human_audit" | "reject";
  expectedCorpusDecision: "retain" | "reject";
  expectedVerdict: "excellent" | "qualified" | "low_value" | "spam";
  expectedCreatorExpansion: "high" | "standard" | "watch" | "none";
  positiveSignals: readonly string[];
  failureReasons: readonly string[];
  auditSummary: string;
}

export const humanCalibrationCases: readonly HumanCalibrationCase[] = [
  {
    sourceContentId: "2071039390856516391",
    canonicalUrl: "https://www.zhihu.com/question/2071014727606703118/answer/2071039390856516391",
    title: "DeepSeek V4 Pro 正式版发布，如何评价该模型？",
    authorName: "卜寒兮",
    humanDimensionScores: {
      informationGainAndDepth: 6.5,
      professionalismAndOriginality: 6.5,
    },
    humanDimensionReasons: {
      informationGainAndDepth:
        "发布信息和官方 benchmark 多数属于公共背景，但三个具体任务、不同 harness 的效果差异、失败现象与使用成本是一手增量；这些观察对工具选择有参考价值，受样本量和量化控制限制评为 6.5。",
      professionalismAndOriginality:
        "作者不仅复述公开数据，还基于实际接入和任务测试提出 Claude Code 与 opencode 表现差异等独立判断；判断有具体观察支撑，但尚未形成更系统的实验框架，评为 6.5。",
    },
    recordedAt: "2026-08-13",
    expectedCorpusDecision: "retain",
    expectedVerdict: "qualified",
    expectedCreatorExpansion: "watch",
    positiveSignals: [
      "FIRST_HAND_MODEL_TESTS",
      "HARNESS_COMPARISON",
      "CONCRETE_FAILURE_OBSERVATIONS",
      "PERSONAL_COST_OBSERVATION",
    ],
    failureReasons: ["LIMITED_SAMPLE_SIZE", "LIMITED_QUANTITATIVE_CONTROL"],
    auditSummary:
      "文章中的发布信息和官方 benchmark 多数可由公开资料重建，但作者实际执行了三个任务，比较 Claude Code 与 opencode 的 harness 表现，并记录目录遮挡、乱码、功能缺失和高强度使用成本。这些具体成功与失败观察不是盲基线能够生成的一手材料，且能帮助读者选择接入方式；样本量和量化控制不足，使其暂不宜达到 7 分以上。信息增量与专业原创人工校准均为 6.5。",
  },
  {
    sourceContentId: "2063647687766020746",
    canonicalUrl: "https://zhuanlan.zhihu.com/p/2063647687766020746",
    title: "从“能说话”到“能干活”：AI Agent 的 2026 拐点已经到来",
    expectedPreviewDecision: "reject",
    expectedFullDecision: "reject",
    expectedCorpusDecision: "reject",
    expectedVerdict: "low_value",
    expectedCreatorExpansion: "none",
    positiveSignals: [],
    failureReasons: [
      "OBVIOUS_THESIS_NO_GAIN",
      "FRONTIER_STALE",
      "NO_CURRENT_LEADING_SYSTEMS",
      "NO_OPERATIONAL_EVIDENCE",
      "GENERIC_AI_STYLE",
    ],
    auditSummary:
      "主要说服读者接受 Agent 很重要这一显然观点，没有覆盖当期代表性系统，也没有实效、案例或独有洞察。",
  },
  {
    sourceContentId: "2062194600119478012",
    canonicalUrl: "https://zhuanlan.zhihu.com/p/2062194600119478012",
    title: "2026 下半年最值得 All-in 的 6 个 AI Agent 项目 + 普通人 90 天变现 SOP",
    expectedPreviewDecision: "human_review",
    expectedFullDecision: "reject",
    expectedCorpusDecision: "reject",
    expectedVerdict: "low_value",
    expectedCreatorExpansion: "none",
    positiveSignals: ["PERSONAL_SELECTION_METHOD_SIGNAL"],
    failureReasons: [
      "COMMONPLACE_TOOL_SELECTION",
      "UNVERIFIABLE_MONETIZATION",
      "NO_MARKET_VALIDATION",
      "NO_FIRST_HAND_FAILURES",
      "IMPLAUSIBLE_CASE",
      "MARKETING_FRAMING",
    ],
    auditSummary:
      "个人筛选方法是有限正向信号，但工具选择仍属老生常谈，变现案例缺少市场调研、真实客户、成本、失败和亲历踩坑证据。",
  },
  {
    sourceContentId: "670574382",
    canonicalUrl: "https://zhuanlan.zhihu.com/p/670574382",
    title: "国内外知名大模型及应用——模型/应用维度（2026/08/05）",
    authorName: "吕阿阳",
    humanScore: 6,
    expectedCorpusDecision: "retain",
    expectedVerdict: "qualified",
    expectedCreatorExpansion: "watch",
    positiveSignals: ["CURRENT_INFORMATION", "USEFUL_BREADTH", "NO_OBVIOUS_FALSEHOODS"],
    failureReasons: ["INSUFFICIENT_DEPTH"],
    auditSummary: "内容较新且具有一定广度，没有明显错误，但深度不足。",
  },
  {
    sourceContentId: "2067329045562445938",
    canonicalUrl: "https://zhuanlan.zhihu.com/p/2067329045562445938",
    title: "Claude Code Token 实战复盘——从 187M 到 56M 的优化落地全过程",
    authorName: "AI工具人产品经理",
    humanScore: 6.5,
    expectedCorpusDecision: "retain",
    expectedVerdict: "qualified",
    expectedCreatorExpansion: "watch",
    positiveSignals: ["FIRST_HAND_EXPERIENCE", "UNIQUE_PROCESS", "PRACTICAL_DETAIL"],
    failureReasons: ["CASUAL_EXPRESSION", "POOR_FORMATTING", "READABILITY_FRICTION"],
    auditSummary: "有较多独立实践经验，过程不易从别处获得；但表达与排版随意，阅读障碍明显。",
  },
  {
    sourceContentId: "2067026717789561572",
    canonicalUrl: "https://zhuanlan.zhihu.com/p/2067026717789561572",
    title: "AI Agent 调用成本实测：18KB 插件把缓存命中率做到 96%，成本省了 8.8%",
    humanScore: 7,
    expectedCorpusDecision: "retain",
    expectedVerdict: "qualified",
    expectedCreatorExpansion: "standard",
    positiveSignals: ["CONTROLLED_EXPERIMENT", "SPECIFIC_METRICS", "CLEAR_METHOD"],
    failureReasons: ["ADVERTISING_SIGNAL", "GENERIC_AI_STYLE_SIGNAL"],
    auditSummary: "有详实实验、对照组和正规测试流程，表达清楚；但存在广告嫌疑和 AI 文案味。",
  },
  {
    sourceContentId: "2066885078222382850",
    canonicalUrl: "https://zhuanlan.zhihu.com/p/2066885078222382850",
    title: "我用 peaks-loop 两周全栈开发了一个企业级 AI Agent 监控系统",
    humanScore: 8,
    expectedCorpusDecision: "retain",
    expectedVerdict: "excellent",
    expectedCreatorExpansion: "high",
    positiveSignals: [
      "FIRST_HAND_EXPERIENCE",
      "FAILURE_DETAILS",
      "HIGH_ORIGINALITY",
      "PRACTICAL_VALUE",
    ],
    failureReasons: ["NO_SOTA_COMPARISON", "MISSING_RESOURCE_LINK"],
    auditSummary:
      "有大量个人踩坑和实践细节，原创性与参考价值高；但没有对比 SOTA，附录项目资源也未见链接。",
  },
  {
    sourceContentId: "2066575016153003127",
    canonicalUrl: "https://zhuanlan.zhihu.com/p/2066575016153003127",
    title:
      "一次遗留架构推翻重来：从 monorepo 拆 3 仓，OpenSpec × Claude Code 跨仓架构演进AI 编码驾驭工程完整复盘",
    humanScore: 7,
    expectedCorpusDecision: "retain",
    expectedVerdict: "qualified",
    expectedCreatorExpansion: "standard",
    positiveSignals: ["PROJECT_RETROSPECTIVE", "FIRST_HAND_ENGINEERING_VALUE"],
    failureReasons: ["NO_COMPARISON_GROUP", "JARGON_DENSE", "READABILITY_FRICTION"],
    auditSummary: "自有项目复盘具有经验价值；但没有对照组，表达晦涩，术语直接铺陈，未照顾读者。",
  },
  {
    sourceContentId: "2066067862097248938",
    canonicalUrl: "https://zhuanlan.zhihu.com/p/2066067862097248938",
    title: "Seed2.1 深度拆解｜搭配火山 Agent Plan，重新定义本地 Agent 开发生产范式",
    authorName: "几何",
    humanScore: 2,
    expectedCorpusDecision: "reject",
    expectedVerdict: "low_value",
    expectedCreatorExpansion: "none",
    positiveSignals: ["PRODUCT_SPECIFIC_INFORMATION"],
    failureReasons: [
      "SOFT_ADVERTORIAL",
      "NO_SOTA_COMPARISON",
      "STALE_TOOLING",
      "INSUFFICIENT_DETAIL",
    ],
    auditSummary:
      "本质是 Seed2.1 软文，没有 SOTA 对照，工具选择过时，即使作为产品介绍也缺少足够细节。",
  },
  {
    sourceContentId: "2065414418951938099",
    canonicalUrl: "https://zhuanlan.zhihu.com/p/2065414418951938099",
    title: "2026 年 AI Agent 框架全景：12 大主流框架深度横评",
    authorName: "jiaao yu",
    humanScore: 4,
    expectedCorpusDecision: "reject",
    expectedVerdict: "low_value",
    expectedCreatorExpansion: "none",
    positiveSignals: ["NO_OBVIOUS_FALSEHOODS"],
    failureReasons: [
      "UNSOURCED_CLAIMS",
      "FRONTIER_UNCERTAIN",
      "SHALLOW_SURVEY",
      "DEPTH_TITLE_MISMATCH",
    ],
    auditSummary:
      "没有明显胡说，但引用和断言均无出处，难以验证时效性；标题声称深度横评，正文却泛泛而谈。",
  },
  {
    sourceContentId: "2063995722140054088",
    canonicalUrl: "https://zhuanlan.zhihu.com/p/2063995722140054088",
    title: "2026年，双非二本想入行AI Agent开发还有机会吗？",
    authorName: "涡轮增鸭",
    humanScore: 0,
    expectedCorpusDecision: "reject",
    expectedVerdict: "spam",
    expectedCreatorExpansion: "none",
    positiveSignals: [],
    failureReasons: ["COURSE_SALES", "NO_INFORMATION_VALUE", "EMOTIONAL_MARKETING"],
    auditSummary: "纯卖课，没有可保留的信息价值。",
  },
  {
    sourceContentId: "2070519089978667242",
    canonicalUrl: "https://www.zhihu.com/question/2070336637360518307/answer/2070519089978667242",
    title: "如何评价 Anthropic 宣布将黎曼猜想的已知下界从 41.6% 提高到了 67.2%？",
    authorName: "酱紫君",
    humanScore: 6.5,
    humanScoreRange: { minimum: 6, maximum: 6.5 },
    recordedAt: "2026-08-11",
    expectedCorpusDecision: "retain",
    expectedVerdict: "qualified",
    expectedCreatorExpansion: "watch",
    positiveSignals: [
      "PROFESSIONAL_TACIT_EXPERIENCE",
      "ACADEMIC_INCENTIVE_ANALYSIS",
      "SHARP_ORIGINAL_VIEWPOINT",
      "DOMAIN_EXPERTISE_CONTEXT",
    ],
    failureReasons: ["BRIEF_FOR_OUTSIDERS", "LIMITED_EXPLICIT_SOURCING"],
    auditSummary:
      "回答依靠数学领域知识和学术共同体经验，解释了这项工作如何建立在人类学者框架之上，以及研究激励为何让学者回避此类高劳动、低声望的优化工作。观点尖锐且简短，对外行不够友好，但专业推理、隐性经验和独立判断构成明确价值；情绪与讽刺不属于商业推广信号。人工合理区间为 6—6.5 分。",
  },
  {
    sourceContentId: "2002700235206595099",
    canonicalUrl: "https://www.zhihu.com/question/31221711/answer/2002700235206595099",
    title: "在日留学生能真正融入日本的社会吗？",
    authorName: "临江仙",
    humanScore: 4,
    humanScoreRange: { minimum: 4, maximum: 4 },
    recordedAt: "2026-08-11",
    expectedCorpusDecision: "reject",
    expectedVerdict: "low_value",
    expectedCreatorExpansion: "none",
    positiveSignals: ["MEMORABLE_ANALOGY", "INDEPENDENT_VIEWPOINT"],
    failureReasons: [
      "NO_RELEVANT_BACKGROUND_SIGNAL",
      "NO_CONCRETE_OBSERVATION",
      "ASSERTION_AS_EXPLANATION",
      "ANALOGY_WITHOUT_CAUSAL_SUPPORT",
    ],
    auditSummary:
      "用 MMORPG 和魔族类比日本社会，表达鲜明但没有展示在日经历、研究背景、具体案例或可检查的因果链。基本论证模式是“某群体就是某种东西”，新颖比喻不能代替社会观察和证据，因此人工评分为 4 分。",
  },
  {
    sourceContentId: "2070507157703938737",
    canonicalUrl: "https://www.zhihu.com/question/424578087/answer/2070507157703938737",
    title: "你是怎样度过自己人生的至暗时刻？",
    authorName: "幺 儿",
    humanScore: 5.5,
    humanScoreRange: { minimum: 5.5, maximum: 6 },
    recordedAt: "2026-08-11",
    expectedCorpusDecision: "reject",
    expectedVerdict: "low_value",
    expectedCreatorExpansion: "none",
    positiveSignals: ["AUTHENTIC_PERSONAL_EXPERIENCE", "ORIGINAL_HUMAN_EFFORT"],
    failureReasons: [
      "LIMITED_EXPERIENCE_DETAIL",
      "LIMITED_DECISION_PROCESS",
      "LOW_TRANSFERABLE_VALUE",
      "FRAGMENTARY_NARRATIVE",
    ],
    auditSummary:
      "经历可信，确认具有原创价值和人工投入；但正文没有充分展开个人选择、应对过程和心路变化，整体更接近零散倾诉，读者能迁移的参考价值有限。人工合理区间为 5.5—6 分，取 5.5。",
  },
  {
    sourceContentId: "1920566492719747383",
    canonicalUrl: "https://www.zhihu.com/question/421857764/answer/1920566492719747383",
    title: "有人认识这个小姐姐吗，超爱她的照片？",
    authorName: "工叔",
    humanScore: 7.5,
    humanScoreRange: { minimum: 7.5, maximum: 7.5 },
    recordedAt: "2026-08-11",
    expectedCorpusDecision: "retain",
    expectedVerdict: "qualified",
    expectedCreatorExpansion: "standard",
    positiveSignals: [
      "COMPLETE_EVENT_TIMELINE",
      "MULTI_SOURCE_RESEARCH_EFFORT",
      "HIGH_READER_ORIENTATION",
      "ENGAGING_NARRATIVE",
      "SUBSTANTIAL_EVIDENCE",
    ],
    failureReasons: ["LIMITED_ANALYTICAL_DEPTH"],
    auditSummary:
      "系统整理了人物身份、关系和八卦事件的历史脉络，材料具体、证据充足且叙事有趣，足以让完全不了解事件的读者一次掌握全貌。搜集、核对和组织公开材料本身构成高投入、高价值的原创劳动，人工评分为 7.5 分。",
  },
  {
    sourceContentId: "2070458591644069904",
    canonicalUrl: "https://zhuanlan.zhihu.com/p/2070458591644069904",
    title: "改写纳米光学底层逻辑！MIT学者搭建通用可重构光子平台",
    authorName: "DeepTech深科技",
    humanScore: 6.5,
    humanScoreRange: { minimum: 6, maximum: 6.5 },
    recordedAt: "2026-08-12",
    expectedCorpusDecision: "retain",
    expectedVerdict: "qualified",
    expectedCreatorExpansion: "watch",
    positiveSignals: [
      "RECENT_RESEARCH_REPORT",
      "ACCURATE_DOMAIN_TERMINOLOGY",
      "INTERVIEW_EFFORT",
      "VERIFIABLE_PUBLIC_FACTS",
    ],
    failureReasons: [
      "PUBLIC_INFORMATION_RECONSTRUCTION",
      "LIMITED_INDEPENDENT_ANALYSIS",
      "BIOGRAPHICAL_CHRONOLOGY",
      "JARGON_HEAVY_FOR_GENERAL_READERS",
    ],
    auditSummary:
      "人物身份、研究方向和技术信息基本可靠，也能确认采访与资料整理工作量；但正文主要按履历、公开论文信息和受访者陈述顺序转述，缺少有力度的追问、比较和独立判断。大量术语缺少面向普通读者的解释，提高了阅读成本；公开检索很可能重建其中大部分内容，因此人工合理区间为 6—6.5 分，取 6.5。",
  },
];
