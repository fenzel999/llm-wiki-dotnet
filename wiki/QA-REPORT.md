---
title: 质量报告 QA-REPORT
summary: Agent 自审透明度报告——记录了什么、判对错、已修与待你判定项。
tags: [governance, report]
introduced-in: general
applies-to: [all]
status: stable
source: AGENTS.md
updated: 2026-07-09
---

# QA-REPORT — 质量自审报告

本文件是 Agent 自审（Audit）的**透明度记录**：做了什么判断、改了什么、哪些在等你判定。
每次 Audit/Correct 后追加或更新本节内容。

---

## 最近一次自审

- 日期：2026-07-09（建库初始化 + 种子 + 构建验证）
- 范围：全库骨架、~51 种子页、MkDocs 构建（零死链）、graph.json（61 节点/274 边）
- 结论：结构、链接、可视化通过；**.NET 10 / C# 14 部分新语法由子代理按已知事实撰写，
  个别 API 名称/具体写法标注了 `⚠️ needs-your-call`，待你（人类）按官方文档最终确认**。
  这些页已可阅读，仅个别细节可能需要订正。

## 已自修

| 日期 | 页面 | 改了什么 | 依据 |
|------|------|----------|------|
| 2026-07-09 | dotnet/* 与 patterns/* | 修正子代理写错的相对链接深度（`../sources` ↔ `../../sources`、`../../dotnet` ↔ `../dotnet`） | Lint 死链扫描 |

## 待你判定（⚠️ needs-your-call）

> 以下为种子撰写时对 .NET 10 / C# 14 具体语法的不确定点，建议按官方文档核对后由 Agent Correct。

| 日期 | 页面 | 疑问 |
|------|------|------|
| 2026-07-09 | dotnet/file-based-apps.md | `#`:package` 引用指令语法是否准确 |
| 2026-07-09 | dotnet/csharp/extension-members.md | `extension(string s) { ... }` 块语法 |
| 2026-07-09 | dotnet/csharp/null-conditional-assignment.md | 索引器形式 `list?[0] = 42;` 是否支持 |
| 2026-07-09 | dotnet/csharp/nameof-unbound-generics.md | `nameof(Dictionary<,>)` 多元写法 |
| 2026-07-09 | dotnet/csharp/lambda-parameter-modifiers.md | `out` 参数省略类型写法 |
| 2026-07-09 | dotnet/aspnet-core/minimal-api-validation.md | `AddValidation()`/`WithValidation()` API 名 |
| 2026-07-09 | dotnet/aspnet-core/openapi-3-1.md | ASP.NET Core 默认 OpenAPI 版本是否为 3.1 |
| 2026-07-09 | dotnet/ef-core/complex-types-json.md | 复杂类型 `ToJson()` 可用性 |
| 2026-07-09 | dotnet/ef-core/named-query-filters.md | `HasQueryFilter(string name, ...)` 签名 |
| 2026-07-09 | dotnet/runtime/jit-optimizations.md | 动态 PGO 开关名 |
| 2026-07-09 | dotnet/blazor/javascript-improvements.md | 新增 JS 互操作 API 名称 |

## 待办（Lint 发现）

- [ ] 种子页全部写完后跑首轮全量 Audit，逐页回填 Q1–Q7 判定。
- [ ] 校验 `wiki/思维导图.md` 节点可点击跳转、分类清晰。
