# 知乎掘金

知乎掘金是一个面向知乎内容的开放质量评估与可控 Feed 实验项目。当前版本可以读取知乎回答和专栏文章，结合问题上下文、外部检索证据与 DeepSeek，对内容进行结构化评分。

## 当前能力

- 网页优先读取知乎回答与专栏正文，必要时使用备用全文读取或知乎开放平台
- 长文取开头 2,000 字和结尾 2,000 字
- 六维 10 分制评分：证据和真实性、实践与经验、信息增量与深度、专业与原创、无商业推广、时效价值
- 识别明确商业推广，并应用独立的扣分规则
- 浏览器本地保存最近评分记录，不上传本地历史
- DeepSeek 余额不足或请求限流时提供用户可见提示

## 本地运行

需要 Bun 1.3 或更高版本。

```bash
bun install
cp .env.example .env
bun run dev:web
```

Windows PowerShell 可以使用：

```powershell
Copy-Item .env.example .env
bun run dev:web
```

至少需要在 `.env` 中配置 `DEEPSEEK_API_KEY`。知乎开放平台凭据与本地 CLI 是可选的数据读取和外部核验能力。所有密钥只能保存在服务端环境变量中，不要使用 `NEXT_PUBLIC_*` 前缀。

## 质量检查

```bash
bun run check
bun run typecheck
bun test
bun run build
```

## 隐私与安全

- `.env*`、私钥、数据库文件、日志、构建产物和编辑器配置默认不会进入 Git；仅 `.env.example` 被保留。
- 前端最近评分保存在浏览器 `localStorage`，不应把真实测试历史提交到仓库。
- 提交前请运行密钥扫描，并检查 `git status --ignored`。

## 许可证

[Apache License 2.0](./LICENSE)
