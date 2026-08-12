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
            <h2>六大维度，精确评判</h2>
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
            <h3>商业独立性</h3>
            <p>只识别产品效果暗示、软文、引流、洗稿与起号；情绪和立场不扣分。</p>
          </article>
          <article>
            <strong>10%</strong>
            <h3>时效价值</h3>
            <p>新鲜且已核对的新闻获得加分；非时效内容保持中性。</p>
          </article>
        </div>
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
