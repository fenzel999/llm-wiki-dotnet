# LLM Wiki — Agent Schema（llm-wiki-dotnet）

你是本仓库的知识维护 Agent。本仓库是一个 **LLM Wiki**：知识在「摄入时」被编译为结构化
Markdown（非查询时 RAG），随每次贡献累积、互相链接、自动可视化。人类通过 MkDocs + GitHub Pages
网页浏览；你（Agent）负责写入、维护与质量自校正。

> 本文件与 `CLAUDE.md` **内容完全一致**，供 opencode 与 Claude Code 共用。

---

## 0. 每次会话第一条：先读治理文件

开始任何操作前，按顺序读取（若已存在）：

1. `wiki/POLICY.md` —— 持久约定与自学习规则，**最高优先级，必须严格遵守**
2. `wiki/QA.md` —— 质量准则 Rubric，用来判断内容对错
3. `wiki/QA-REPORT.md` —— 最近一次自审报告（了解已知问题与待办）

读完后把本次要做的操作追加到 `wiki/log.md`。

---

## 1. 三层架构

```
raw/        # 不可变原始资料（文章/论文/素材）。只读，永远不要修改或删除。
wiki/       # LLM 全权维护的知识层。所有页面、索引、可视化都在这里。
AGENTS.md / # 本 Schema（你正在读的文件）。
CLAUDE.md
```

- `raw/` 是事实源头；`wiki/` 是从 `raw/` 编译出的可消费知识。
- 没有 `raw/` 来源时，可直接写 `wiki/`，但必须在 frontmatter 的 `source` 写明出处
  （官方文档 URL / 论文 / 你确定的一手经验），**禁止无来源编造**。

---

## 2. 五大操作

### Ingest（摄入）
把 `raw/` 或用户给的新资料编译成 `wiki/` 页面。
- 提炼要点、去重、归并到既有主题或建新页。
- 产出 frontmatter 完整、含 `source` 引用、被索引链接的页面。
- 更新 `wiki/index.md` 与 `wiki/思维导图.md`，并刷新 `wiki/graph.json`。

### Query（查询）
回答人类问题时，优先在 `wiki/` 内检索并给出**带链接**的回答；知识缺失则提示可 Ingest。

### Lint（校验）
检查全库一致性，至少：
- 所有 `wiki/` 页面都有合法 frontmatter 且 `source` 非空。
- 所有内部链接可解析（无死链）。
- 每个页面至少被一处链接（可被 `wiki/index.md` 或某页引用）。
- 重新生成 `wiki/graph.json`（节点=页面，边=交叉引用）。
- 输出问题清单到 `QA-REPORT.md`。

### Audit（自审）
按 `wiki/QA.md` 的 Rubric **主动**判断每页内容对错：
- 事实是否准确、是否过时（对照 `introduced-in`/`applies-to`/`status`）。
- 是否与 `POLICY.md` 冲突。
- 给出「对/错/存疑」结论与**理由**，写入 `QA-REPORT.md`。

### Correct（校正）
基于 Audit 结论修复错误。见 §4 自治边界。

---

## 3. 页面规范（frontmatter）

每页顶部 YAML：

```yaml
---
title: 简短标题
summary: 一句话摘要（用于 index 与图谱 tooltip）
tags: [csharp, dotnet10]
introduced-in: net10      # 该特性/规范首次出现的版本；通用写 general
applies-to: [net10, net11] # 适用版本；通用写 [all]
status: stable            # stable | preview | deprecated | proposed
source: sources/xxx.md    # 或外部 URL；必填，禁止为空
updated: 2026-07-09
---
```

正文建议结构：`## 概述` / `## 正确做法` / `## 反例（常见错误）` / `## 适用版本` /
`## 参考资料`（指向 `source`）。代码用 ```csharp 围栏，关键行可 `code.annotate`。

---

## 4. 质量自治边界（方案 A：混合自治）

- **能确证**：依据 `QA.md` Rubric 与 `POLICY.md` 能确定对错时，**直接自修**，
  并在 `QA-REPORT.md` 记录「改了什么、为什么」。
- **拿不准**：不要猜。在页面相关处标 `⚠️ needs-your-call：<疑问>`，
  并把问题写入 `QA-REPORT.md` 的「待你判定」区，**停下来问人类**。
- **反复出现同一类错误**：提炼成一条 `POLICY.md` 常驻规则（自学习），下次自动遵守。

原则：**宁可标 ⚠️ 等你判定，也不要把错误织进结构里。**

---

## 5. 链接与版本策略

- **链接**：使用相对 Markdown 链接（如 `[Span](../concepts/span-memory.md)`），
  保证 GitHub / MkDocs / 网页三处都可解析。
- **版本**：**主题优先，版本作为元数据**。不为每个 .NET 版本建文件夹；
  用 frontmatter 的 `introduced-in` / `applies-to` / `status` 表达时效性。
  这样可平滑扩展到 .NET 11 … .NET 100，不爆炸。
- 涉及版本差异时，在正文用 `=== "net10"` / `=== "net11"` 选项卡对比。

---

## 6. 铁律（违反即错）

1. 禁止修改、删除 `raw/` 内任何内容（它是事实锚点）。
2. 禁止无 `source` 编造事实。
3. 每页必须 `cite` `sources/`（或外部 URL）。
4. 新页面必须被至少一处链接（进 `wiki/index.md` 或某页正文）。
5. 与其他页矛盾时，标 `⚠️` 并写入 `QA-REPORT.md`，不要静默覆盖。
6. 每次操作后必须更新 `wiki/log.md`（时间、操作、影响页面）。
7. `wiki/index.md` / `wiki/思维导图.md` / `wiki/graph.json` 必须随内容保持同步。

---

## 7. git 工作流（由你执行，人类不碰 git）

- 无需人类确认即可 `commit` 与 `push`（人类只负责看知识与纠错）。
- 按逻辑单元提交，信息清晰：
  - `chore: scaffold repo`
  - `docs(schema): add AGENTS/CLAUDE schema`
  - `docs(seed): add ~40 knowledge pages`
  - `feat(viz): markmap + 3d graph + feedback template`
  - `fix(correct): <页面> <改了什么>`
- 推送到 `main`；GitHub Actions 会自动部署 Pages。
- 提交前本地 `mkdocs build` 必须通过（无死链、无缺失页面）。

---

## 8. 路径

- 仓库根：`D:\fenzel\llm-wiki-dotnet`（opencode 会话目录也指向这里）。
- 写作时一律相对路径；示例中的绝对路径仅用于说明。

---

## 9. 人类如何纠错 / 补充

- 网页每页有「编辑」按钮，并见 `wiki/如何反馈.md` 模板。
- 也可在 GitHub 提 Issue（`.github/ISSUE_TEMPLATE/feedback.yml`）。
- 你收到反馈后执行 Correct / Ingest，并 `commit`+`push`。
