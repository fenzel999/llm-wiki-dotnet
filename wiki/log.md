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
