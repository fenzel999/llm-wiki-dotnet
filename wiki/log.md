---
title: 操作日志
summary: 追加式时间线，记录每次 Ingest/Query/Lint/Audit/Correct 的影响页面。
tags: [governance, log]
introduced-in: general
applies-to: [all]
status: stable
source: AGENTS.md
updated: 2026-07-09
---

# log — 操作日志

追加式记录。每次操作后在顶部加一行（新在最上）。

---

## 2026-07-10 · 整洁/优雅重构（四方向）

### 1. 清理结构冗余
- `mkdocs.yml` 导航移除重复的 `comparisons/net-evolution.md` 条目（原在 .NET 10 版本对照与实践/对比两处重复）。
- 删除空占位目录：`raw/articles`、`raw/papers`、`raw/assets`、`wiki/assets`（均无文件）；同步更新 `wiki/sources/README.md` 的本地资料说明。

### 2. 修正 source 溯源
- 42 个知识页的 `source` 由占位的 `sources/README.md` 改为真实官方一手来源（Microsoft Learn / 官方博客 / 上游仓库），内部治理与索引页保持 `AGENTS.md`；彻底消除「假来源」。

### 3. 精简合并页面
- C# 14 六页（extension 成员 / field 关键字 / 空条件赋值 / nameof 非绑定泛型 / 隐式 Span 转换 / lambda 参数修饰符）→ `dotnet/csharp/csharp-14.md`（用显式锚点 `#id` 保链接稳定）。
- EF Core 两页（复杂类型与 JSON、命名查询筛选器）→ `dotnet/ef-core/ef-core-10.md`；保留 `ef-data-access.md`（属模式，非特性）。
- ASP.NET Core 两页（最小 API 验证、OpenAPI 3.1）→ `dotnet/aspnet-core/aspnet-core-10.md`。
- 全库引用（index / overview / dotnet/overview / 思维导图 / mkdocs nav / 各版本页 / qa-report 等）同步折叠更新，无死链。

### 4. 改善渲染观感
- 思维导图 `.mm` 增加折叠箭头平滑动画与行 hover 高亮。

- 校验：`mkdocs build --strict` 通过（无死链、无缺失、无重复 nav）。页面数 61 → 54。

## 2026-07-10 · 清理无用构建产物
- 删除本地 `site/`（189 个文件）：MkDocs 生成产物，已被 `.gitignore` 忽略且未纳入 git；GitHub Actions 每次 push 自动重建部署，本地留存属冗余。
- `raw/articles`、`raw/assets`、`raw/papers` 为空占位目录，属 schema 规定结构，保留。
- 项目已符合 LLM Wiki 三层架构（`raw/` 源头、`wiki/` 知识层、`AGENTS.md`/`CLAUDE.md` Schema），无需额外改造。

## 2026-07-09 · 内容整理（AI 友好）
- 治理页归入 `wiki/governance/`：`QA.md→governance/qa.md`、`POLICY.md→governance/policy.md`、`QA-REPORT.md→governance/qa-report.md`、`如何反馈.md→governance/feedback.md`；更新全库链接与导航。
- `index.md` 增加「给 AI 的使用说明」：目录即主题（dotnet/concepts/standards/patterns/anti-patterns/comparisons/governance/sources），说明 frontmatter（tags/summary/source）用法。
- 去除 17 个文件（dotnet/ef/patterns 种子页）的 UTF-8 BOM，统一为无 BOM UTF-8；全库 frontmatter 审计（title/summary/tags/source）通过。
- 分类明确简单：目录即主题，便于 LLM 检索与维护。
- 影响：governance/*、index.md、思维导图.md、overview.md、AGENTS.md、CLAUDE.md、README.md、comparisons/* 及导航。

## 2026-07-09 · 去掉自定义 Result<T>（与最小 API Results<T> 重复）
- 删除 `concepts/result-type.md`：自造 `Result<T>` 与最小 API 内建 `Results<T>`/`TypedResults` 语义重复。
- `minimal-api-organization.md` 新增「类型化返回」小节，统一改用 `Results<T>`/`TypedResults` 表达多响应；示例中去除对自定义 Result 的依赖。
- 同步清理引用：`index.md`、`思维导图.md`、`overview.md`、`swallowing-exceptions.md`（`标准/null-handling.md`、`api-design.md` 改为推荐 `Results<T>`/`TypedResults`）。
- 影响：concepts/result-type.md（删除）、patterns/minimal-api-organization.md、index.md、思维导图.md、overview.md、anti-patterns/swallowing-exceptions.md、standards/*。

## 2026-07-09 · 整理：去 3D 图谱、合并分类、移出 Result/仓储
- 删除 3D 关系图：移除 `知识图谱3D.md`、`graph.json`、`gen_graph.py`；导航与首页不再含 3D 入口，仅保留可导航思维导图。
- 合并分类为 4 个顶层：`.NET 10` / `语言与规范`（概念+规范）/ `实践`（模式+反模式+对比）/ `治理`，思维导图与索引同步重构。
- `Result 类型` 移出「模式」→ 归入 `语言与规范 / 语言概念`（`concepts/result-type.md`）。
- `仓储模式` 改写为的「EF Core 数据访问」移出「模式」→ 归入 `.NET 10 / EF Core`（`dotnet/ef-core/ef-data-access.md`）。
- 同步更新 AGENTS.md/CLAUDE.md/POLICY 中关于 `graph.json`/3D 的描述与 Lint 步骤。
- 影响：mkdocs.yml、index.md、overview.md、思维导图.md、AGENTS.md、CLAUDE.md、POLICY.md、README.md 及上述两个页面链接。

## 2026-07-09 · 纠正：验证改用 .NET 10 内置（不用 FluentValidation）
- `minimal-api-validation.md` 改为 .NET 10 最小 API 内置验证（`AddValidation()` + `WithValidation()`，数据注解 + `IValidatableObject`），不再使用 FluentValidation。
- 影响：dotnet/aspnet-core/minimal-api-validation.md。

## 2026-07-09 · 纠正：去 Swagger / 用 FluentValidation / EF 不用仓储+UoW / 不用 Controller
- OpenAPI：移除 Swashbuckle/Swagger，统一 .NET 10 原生 `AddOpenApi()` + `MapOpenApi()`（openapi-3-1.md）。
- 验证：最小 API 验证改为以 FluentValidation 为主（验证器 + 端点过滤器），.NET 10 内置验证作为备选（minimal-api-validation.md）。
- EF：将 `patterns/repository.md` 改写为「EF Core 数据访问：不引入仓储/工作单元」，直接注入 `DbContext`；清除全库对 Repository/UoW/Controller 的推荐与示例代码。
- Web 层：统一最小 API，不使用 Controller（minimal-api-organization.md、api-design.md 改为应用服务 + `DbContext`）。
- 可视化：思维导图增加分组 emoji 与 `initialExpandLevel` 折叠、按主题着色；3D 图谱按连接数定节点大小、按主题着色、加箭头与图例。
- 影响：dotnet/aspnet-core/*、patterns/*、standards/*、concepts/*、anti-patterns/*、index.md、overview.md、思维导图.md、知识图谱3D.md。

## 2026-07-09 · 部署上线
- `gh repo create llm-wiki-dotnet --public`（owner: fenzel999）。
- 分支 `master` → 重命名为 `main` 并设为默认分支；删除 `master`。
- 启用 GitHub Pages（build_type=workflow），放开 `github-pages` 环境部署分支策略（main 设为保护分支）。
- `mkdocs build` 通过 → GitHub Actions 自动部署成功。
- 站点：https://fenzel999.github.io/llm-wiki-dotnet/  （HTTP 200，思维导图/3D 图谱/各页面均可访问）
- 影响：线上站点、Actions 流水线。之后 Agent 每次 commit+push 自动重新部署。

## 2026-07-09 · seed + viz + build
- 写入 ~51 个种子页（dotnet/concepts/standards/patterns/anti-patterns/comparisons/sources）。
- 思维导图改为 markmap CDN 渲染（可点击节点跳转）；3D 图谱用 3d-force-graph（点击节点跳转）。
- 生成 wiki/graph.json（61 节点 / 274 边），由 Lint 依据交叉引用生成。
- 修正子代理写错的相对链接深度；`mkdocs build` 零死链通过。
- 记录 .NET 10 语法待确认项至 QA-REPORT.md「待你判定」。
- 影响：wiki/ 全量内容、可视化、graph.json。

## 2026-07-09 · scaffold
- 建仓库骨架、mkdocs.yml、.github、.gitignore、Issue 模板。
- 写 AGENTS.md ≡ CLAUDE.md Schema。
- 写治理文件 POLICY.md / QA.md / QA-REPORT.md / 如何反馈.md。
- 影响：仓库根、wiki/ 治理层。
- 待办：种子页面、可视化、git 提交与 push。
