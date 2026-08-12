import type { CrawlCadence, TopicNode } from "./types";

function topic(
  id: string,
  label: string,
  aliases: readonly string[] = [],
  priority = 3,
  cadence: CrawlCadence = "twice_weekly",
): TopicNode {
  return { id, label, level: "topic", aliases, priority, cadence };
}

function section(
  id: string,
  label: string,
  children: readonly TopicNode[],
  aliases: readonly string[] = [],
  priority = 3,
): TopicNode {
  return {
    id,
    label,
    level: "section",
    aliases,
    priority,
    cadence: "twice_weekly",
    children,
  };
}

function domain(
  id: string,
  label: string,
  children: readonly TopicNode[],
  aliases: readonly string[] = [],
  priority = 3,
): TopicNode {
  return {
    id,
    label,
    level: "domain",
    aliases,
    priority,
    cadence: "weekly",
    children,
  };
}

export const knowledgeTaxonomy = [
  domain(
    "artificial-intelligence",
    "人工智能",
    [
      section("foundation-models", "基础模型", [
        topic("llm", "大语言模型", ["LLM", "大模型"], 5, "daily"),
        topic("model-pretraining", "模型预训练", ["预训练", "pretraining"], 5),
        topic("training-data", "训练数据与数据清洗", ["数据清洗", "语料治理", "数据工程"], 5),
        topic("fine-tuning-alignment", "微调与对齐", ["SFT", "RLHF", "偏好对齐"], 4),
        topic("inference-deployment", "推理与部署", ["模型推理", "量化", "推理优化"], 4),
        topic("rag-knowledge", "RAG 与知识系统", ["RAG", "知识库", "检索增强生成"], 5),
        topic("model-evaluation", "模型评测", ["benchmark", "大模型评测"], 5, "daily"),
        topic("ai-safety-alignment", "AI 安全与对齐", ["模型安全", "AI safety"], 5),
      ]),
      section("models-products", "模型与产品", [
        topic("chatgpt", "ChatGPT", ["OpenAI", "GPT"], 5, "daily"),
        topic("deepseek", "DeepSeek", ["深度求索", "DeepSeek V4"], 5, "daily"),
        topic("kimi-k3", "Kimi K3", ["Kimi", "月之暗面", "Moonshot AI"], 5, "daily"),
        topic("open-models", "开源大模型", ["开源模型", "open weights"], 5),
        topic("multimodal-models", "多模态模型", ["视觉语言模型", "VLM", "多模态"], 4),
        topic("model-products-comparison", "模型产品横评", ["模型对比", "模型选型"], 5),
      ]),
      section("ai-agents", "AI Agent", [
        topic("agent-frameworks", "Agent 框架", ["智能体框架", "Agents SDK"], 5, "daily"),
        topic("agent-tool-use", "工具调用与 MCP", ["tool use", "function calling", "MCP"], 5),
        topic("agent-memory", "Agent 记忆与上下文", ["agent memory", "上下文工程"], 4),
        topic("multi-agent", "多智能体系统", ["multi-agent", "Agent Swarm"], 4),
        topic("agent-production", "Agent 生产实践", ["智能体落地", "Agent 工程"], 5, "daily"),
        topic("agent-evaluation", "Agent 评测", ["智能体评测", "agent benchmark"], 5),
      ]),
      section("ai-coding", "AI 编程", [
        topic("vibe-coding", "Vibe Coding", ["氛围编程", "AI 编程"], 5, "daily"),
        topic("coding-agents", "Coding Agent", ["代码智能体", "编程 Agent"], 5),
        topic("ai-ide", "AI IDE 与编程工具", ["AI 编辑器", "代码助手"], 4),
        topic("ai-software-workflow", "AI 软件工程工作流", ["AI 开发流程", "AI 工程提效"], 4),
      ]),
      section("generative-media", "生成式媒体", [
        topic("ai-film", "AI 影视", ["AI 电影", "AI 短片"], 5, "daily"),
        topic("ai-video", "AI 视频生成", ["视频模型", "文生视频"], 5),
        topic("ai-image", "AI 图像生成", ["文生图", "图像模型"], 4),
        topic("ai-3d", "AI 3D", ["3D 生成", "AI 建模"], 4),
        topic("ai-music", "AI 音乐与音频", ["AI 编曲", "音乐生成"], 4),
      ]),
    ],
    ["AI", "机器智能"],
    5,
  ),
  domain("software-open-source", "软件与开源", [
    section("open-source", "开源生态", [
      topic("open-source-projects", "开源项目发现", ["开源项目", "GitHub 项目"], 5, "daily"),
      topic("open-source-governance", "开源治理", ["开源社区", "开源协议"], 3),
      topic("developer-tools", "开发者工具", ["效率工具", "开发工具"], 4),
    ]),
    section("frontend-web", "前端与 Web", [
      topic("frontend", "前端工程", ["前端", "Web 前端"], 5),
      topic("web-platform", "Web 平台", ["浏览器", "Web API"], 3),
      topic("web-performance", "Web 性能", ["前端性能", "Core Web Vitals"], 4),
      topic("web-architecture", "网页与应用架构", ["Web 应用", "全栈开发"], 4),
    ]),
    section("backend-cloud", "后端与云基础设施", [
      topic("backend-engineering", "后端工程", ["服务端", "后端架构"], 4),
      topic("cloud-native", "云原生", ["Kubernetes", "容器", "Serverless"], 4),
      topic("distributed-systems", "分布式系统", ["分布式", "系统设计"], 4),
    ]),
    section("data-storage", "数据与存储", [
      topic("data-engineering", "数据工程", ["数据管道", "ETL", "数据清洗"], 5),
      topic("database-systems", "数据库系统", ["数据库", "SQL", "NoSQL"], 4),
      topic("storage-systems", "存储系统", ["存储", "分布式存储"], 5),
      topic("vector-databases", "向量检索", ["向量数据库", "embedding 检索"], 4),
    ]),
    section("cybersecurity", "安全与网络安全", [
      topic("application-security", "应用安全", ["软件安全", "AppSec"], 5),
      topic("network-security", "网络安全", ["网络攻防", "零信任"], 5),
      topic("privacy-data-security", "隐私与数据安全", ["数据安全", "隐私计算"], 4),
      topic("ai-security", "AI 系统安全", ["Prompt Injection", "模型攻击"], 5),
    ]),
  ]),
  domain("graphics-3d", "计算机图形与三维制作", [
    section("computer-graphics", "计算机图形学", [
      topic("rendering", "渲染", ["实时渲染", "离线渲染", "PBR"], 5),
      topic("geometry-processing", "几何处理", ["几何算法", "Mesh"], 4),
      topic("simulation", "物理模拟", ["流体模拟", "布料模拟", "粒子"], 4),
      topic("graphics-research", "图形学研究", ["SIGGRAPH", "图形学论文"], 4),
    ]),
    section("realtime-engines", "实时引擎", [
      topic("ue5", "Unreal Engine 5", ["UE5", "虚幻引擎"], 5, "daily"),
      topic("realtime-production", "实时内容制作", ["实时动画", "虚拟制片"], 4),
      topic("technical-art", "技术美术", ["TA", "Shader", "材质"], 5),
    ]),
    section("dcc-tools", "DCC 工具", [
      topic("blender", "Blender", ["Blender 建模", "Blender 动画"], 5),
      topic("houdini", "Houdini", ["Houdini 特效", "程序化生成"], 5),
      topic("c4d", "Cinema 4D", ["C4D", "Cinema4D"], 4),
      topic("dcc-pipeline", "三维制作管线", ["CG Pipeline", "资产管线"], 4),
    ]),
  ]),
  domain("visual-design", "视觉、设计与影像", [
    section("design", "设计", [
      topic("product-design", "产品设计", ["交互设计", "UX", "UI"], 5),
      topic("web-design", "网页设计", ["Web Design", "网站设计"], 5),
      topic("motion-design", "动效设计", ["Motion Design", "动效"], 5),
      topic("design-systems", "设计系统", ["Design System", "组件设计"], 4),
    ]),
    section("animation", "动画", [
      topic("animation-production", "动画制作", ["二维动画", "三维动画"], 5),
      topic("character-animation", "角色动画", ["绑定", "动作设计"], 4),
      topic("motion-graphics", "动态图形", ["MG 动画", "Motion Graphics"], 4),
    ]),
    section("illustration-art", "绘画与原画", [
      topic("concept-art", "原画与概念设计", ["原画", "Concept Art"], 5),
      topic("digital-painting", "数字绘画", ["绘画", "板绘"], 5),
      topic("art-fundamentals", "美术基础", ["色彩", "构图", "造型"], 4),
    ]),
    section("photography-video", "摄影与视频", [
      topic("cameras", "相机与镜头", ["相机", "镜头", "摄影器材"], 5, "daily"),
      topic("photography", "摄影创作", ["摄影", "拍摄"], 5),
      topic("video-editing", "剪辑", ["视频剪辑", "后期制作"], 5),
      topic("color-grading", "调色与影像后期", ["调色", "后期"], 4),
    ]),
  ]),
  domain("music-audio", "音乐与声音", [
    section("music-creation", "音乐创作", [
      topic("composition", "编曲与作曲", ["编曲", "作曲"], 5),
      topic("electronic-music", "电子乐", ["电子音乐", "EDM"], 5),
      topic("music-theory", "乐理", ["和声", "配器"], 4),
    ]),
    section("audio-production", "音频制作", [
      topic("mixing-mastering", "混音与母带", ["混音", "母带"], 4),
      topic("sound-design", "声音设计", ["音效", "Sound Design"], 4),
      topic("music-production-tools", "音乐制作工具", ["DAW", "合成器", "插件"], 4),
    ]),
  ]),
  domain("product-growth-media", "产品、增长与内容商业", [
    section("product-management", "产品与商业化", [
      topic("product-management", "产品管理", ["产品经理", "产品"], 5),
      topic("product-strategy", "产品战略", ["商业模式", "产品定位"], 4),
      topic("monetization", "商业化", ["变现", "订阅", "定价"], 4),
    ]),
    section("growth-marketing", "增长与营销", [
      topic("growth", "用户增长", ["增长", "增长黑客"], 5),
      topic("seo", "SEO", ["搜索引擎优化"], 5),
      topic("geo", "GEO", ["生成式引擎优化", "AI 搜索优化"], 5, "daily"),
      topic("brand-marketing", "品牌与营销", ["内容营销", "品牌增长"], 4),
    ]),
    section("creator-economy", "自媒体与创作者经济", [
      topic("self-media", "自媒体", ["内容创业", "个人 IP"], 5),
      topic("content-operations", "内容运营", ["账号运营", "选题"], 5),
      topic("creator-monetization", "创作者变现", ["知识付费", "商业合作"], 4),
    ]),
    section("global-platforms", "出海与平台生态", [
      topic("global-growth", "产品出海", ["海外增长", "出海"], 4),
      topic(
        "google-ecosystem",
        "Google 生态与账号体系",
        ["谷歌绑定", "Google 账号", "Google 生态"],
        3,
      ),
      topic("platform-distribution", "平台分发", ["推荐算法", "流量分发"], 5),
    ]),
  ]),
  domain("finance-investing", "金融与投资", [
    section("investment-methods", "投资方法", [
      topic("investing", "投资体系", ["投资", "资产配置"], 5),
      topic("fundamental-analysis", "基本面分析", ["公司研究", "财报分析"], 5),
      topic("quantitative-investing", "量化投资", ["量化", "因子投资"], 4),
      topic("risk-management", "风险管理", ["仓位管理", "投资风险"], 4),
    ]),
    section("us-equities", "美股", [
      topic("us-stocks", "美股市场", ["美股", "纳斯达克"], 5, "daily"),
      topic("technology-stocks", "科技股", ["AI 股票", "科技公司"], 5),
      topic("semiconductor-stocks", "半导体投资", ["芯片股", "存储股"], 5),
    ]),
    section("macro-industry", "宏观与行业", [
      topic("macroeconomics", "宏观经济", ["利率", "通胀", "经济周期"], 4),
      topic("industry-research", "行业研究", ["产业研究", "行业分析"], 4),
    ]),
  ]),
  domain("hardware-semiconductors", "硬件与半导体", [
    section("semiconductors", "半导体", [
      topic("chip-design", "芯片设计", ["集成电路", "SoC"], 4),
      topic("semiconductor-manufacturing", "半导体制造", ["晶圆", "制程", "封装"], 4),
      topic("ai-compute", "AI 算力", ["GPU", "AI 芯片", "算力基础设施"], 5),
    ]),
    section("memory-storage-hardware", "存储硬件", [
      topic("dram", "DRAM", ["内存", "动态随机存取存储器"], 5, "daily"),
      topic("nand-ssd", "NAND 与 SSD", ["闪存", "SSD"], 4),
      topic("memory-industry", "存储产业", ["存储周期", "存储芯片"], 5),
    ]),
    section("imaging-hardware", "影像硬件", [
      topic("camera-technology", "相机技术", ["CMOS", "图像传感器"], 4),
      topic("computational-photography", "计算摄影", ["影像算法", "手机摄影"], 4),
    ]),
  ]),
  domain("science-mathematics", "基础科学与数学", [
    section("mathematics", "数学", [
      topic("pure-mathematics", "纯数学", ["代数", "几何", "数论"], 5),
      topic("applied-mathematics", "应用数学", ["优化", "数值计算"], 5),
      topic("probability-statistics", "概率与统计", ["统计学", "概率论"], 5),
      topic("mathematical-education", "数学学习", ["数学教育", "数学思维"], 4),
    ]),
    section("physics", "物理学", [
      topic("theoretical-physics", "理论物理", ["量子力学", "相对论"], 5),
      topic("experimental-physics", "实验物理", ["粒子物理", "凝聚态"], 4),
      topic("computational-physics", "计算物理", ["物理模拟", "科学计算"], 4),
    ]),
    section("astronomy", "天文学", [
      topic("astronomy-observation", "天文观测", ["望远镜", "天体摄影"], 4),
      topic("astrophysics", "天体物理", ["宇宙学", "黑洞"], 5),
      topic("space-science", "空间科学", ["行星科学", "深空探测"], 4),
    ]),
    section("materials-science", "材料科学", [
      topic("advanced-materials", "先进材料", ["新材料", "纳米材料"], 5),
      topic("electronic-materials", "电子材料", ["半导体材料", "光电材料"], 4),
      topic("energy-materials", "能源材料", ["电池材料", "储能材料"], 5),
    ]),
  ]),
  domain("energy-aerospace", "应用科学", [
    section("energy-power", "能源与电力", [
      topic("power-systems", "电力系统", ["电网", "电力市场"], 5),
      topic("renewable-energy", "新能源", ["光伏", "风电", "可再生能源"], 5),
      topic("energy-storage", "储能", ["电池", "储能系统"], 5),
      topic("nuclear-energy", "核能", ["核电", "核聚变"], 4),
      topic("energy-industry", "能源产业", ["能源", "能源转型"], 4),
    ]),
    section("aerospace", "航天与商业太空", [
      topic("spacex", "SpaceX", ["星舰", "Starship"], 5, "daily"),
      topic("commercial-space", "商业航天", ["民营航天", "火箭公司"], 5),
      topic("rockets", "火箭技术", ["运载火箭", "火箭发动机"], 4),
      topic("satellites", "卫星与通信", ["卫星互联网", "低轨卫星"], 4),
    ]),
  ]),
  domain("social-sciences-humanities", "社会科学与人文", [
    section("social-sciences", "社会科学", [
      topic("sociology", "社会学", ["社会结构", "社会研究"], 5),
      topic("anthropology", "人类学", ["文化人类学", "田野调查"], 4),
      topic("political-science", "政治学", ["政治理论", "国际关系"], 4),
      topic("public-policy", "公共政策", ["政策研究", "公共治理"], 4),
    ]),
    section("economics-society", "经济与社会", [
      topic("economic-history", "经济史", ["经济发展史", "商业史"], 4),
      topic("institutional-economics", "制度经济学", ["制度分析", "政治经济学"], 4),
      topic("labor-population", "劳动与人口", ["劳动经济", "人口研究"], 4),
    ]),
    section("psychology-behavior", "心理与行为", [
      topic("psychology", "心理学", ["认知心理", "社会心理"], 5),
      topic("behavioral-science", "行为科学", ["行为经济学", "决策科学"], 4),
      topic("mental-health", "心理健康", ["心理咨询", "情绪健康"], 4),
    ]),
    section("history-philosophy", "历史与哲学", [
      topic("history", "历史研究", ["历史", "史学"], 5),
      topic("history-of-ideas", "思想史", ["观念史", "知识史"], 4),
      topic("philosophy", "哲学", ["认识论", "伦理学", "科学哲学"], 5),
    ]),
    section("law-education-media", "法律、教育与传播", [
      topic("law", "法律", ["法学", "司法"], 4),
      topic("education", "教育", ["教育学", "学习科学"], 4),
      topic("media-studies", "传播与媒介", ["传播学", "媒介研究"], 4),
      topic("internet-culture", "互联网文化", ["网络文化", "数字社会"], 4),
    ]),
  ]),
  domain("games-entertainment", "游戏、生活与娱乐", [
    section("game-development", "游戏开发", [
      topic("game-engineering", "游戏工程", ["游戏开发", "游戏程序"], 5),
      topic("game-engines", "游戏引擎", ["UE5", "Unity", "Godot"], 5, "daily"),
      topic("game-design", "游戏设计", ["玩法设计", "关卡设计", "数值设计"], 5),
      topic("technical-art", "技术美术", ["TA", "渲染优化", "游戏美术管线"], 4),
      topic("indie-games", "独立游戏", ["独立游戏开发", "indie game"], 4),
    ]),
    section("games-market", "游戏产品与产业", [
      topic("pc-console-games", "PC 与主机游戏", ["Steam", "主机游戏", "单机游戏"], 5),
      topic("mobile-games", "移动游戏", ["手游", "手机游戏"], 4),
      topic("game-industry", "游戏产业", ["游戏行业", "游戏商业化", "游戏发行"], 5),
      topic("esports", "电竞", ["电子竞技", "职业联赛"], 4, "daily"),
    ]),
    section("entertainment-culture", "影视动漫与娱乐文化", [
      topic("film-television", "电影与剧集", ["电影", "电视剧", "流媒体"], 5),
      topic("anime-comics", "动漫与漫画", ["动画番剧", "漫画", "二次元"], 4),
      topic("entertainment-industry", "娱乐产业", ["娱乐行业", "综艺", "艺人经纪"], 4),
      topic("interactive-entertainment", "互动娱乐与文化", ["游戏文化", "互动叙事"], 4),
    ]),
  ]),
] as const satisfies readonly TopicNode[];
