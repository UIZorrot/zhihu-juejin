import { knowledgeTaxonomy } from "@zhihu-juejin/taxonomy";
import { ScoreWorkbench } from "./score-workbench";

export default function HomePage() {
  return (
    <main>
      <header className="topbar">
        <div className="brand-mark">掘</div>
        <div>
          <p className="eyebrow">INTERNAL CURATION SYSTEM</p>
          <h1>知乎掘金</h1>
        </div>
        <span className="status">评分引擎 v1</span>
      </header>

      <ScoreWorkbench />

      <section className="method-section">
        <div className="section-heading">
          <div>
            <p className="kicker">SCORING CONTRACT</p>
            <h2>六大正向维度，商业推广单独扣分</h2>
          </div>
          <span>0—10 · 0.5 步进</span>
        </div>
        <div className="method-grid">
          <article>
            <strong>25%</strong>
            <h3>证据和真实性</h3>
            <p>按内容类型检查实验、案例、时间线、人物材料与个人一手叙述。</p>
          </article>
          <article>
            <strong>25%</strong>
            <h3>信息增量与深度</h3>
            <p>通过盲测 AI 基线，识别文章真正多提供了什么。</p>
          </article>
          <article>
            <strong>15%</strong>
            <h3>实践与经验</h3>
            <p>衡量实验、踩坑、亲历、访谈、史料搜集与整理所需的真实投入。</p>
          </article>
          <article>
            <strong>15%</strong>
            <h3>专业与原创</h3>
            <p>既识别专业推理，也奖励对人物、文化语境和事件脉络的真正掌握。</p>
          </article>
          <article>
            <strong>10%</strong>
            <h3>时效价值</h3>
            <p>新鲜且已核对的新闻获得加分；非时效内容保持中性。</p>
          </article>
          <article>
            <strong>10%</strong>
            <h3>舆论氛围</h3>
            <p>评论总体观察占 60%，点赞等互动弱信号占 40%；不把热度等同质量。</p>
          </article>
        </div>
        <p className="commercial-rule">
          商业推广不参与正向加权：无推广不加分；软文、利益暗示和明确导流按严重程度扣分。
        </p>
      </section>

      <section className="coverage-section">
        <div className="section-heading">
          <div>
            <p className="kicker">KNOWLEDGE COVERAGE</p>
            <h2>主要板块</h2>
          </div>
        </div>
        <div className="coverage-list">
          {knowledgeTaxonomy.map((domain) => (
            <span key={domain.id}>{domain.label}</span>
          ))}
        </div>
      </section>
    </main>
  );
}
