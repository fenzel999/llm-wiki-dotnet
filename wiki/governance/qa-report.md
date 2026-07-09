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
- 结论：结构、链接、可视化通过；.NET 10 / C# 14 新语法由子代理撰写，部分处标注了 `⚠️ needs-your-call`。

- 日期：2026-07-09（联网核实 + 订正）
- 范围：11 处 `⚠️ needs-your-call` 不确定点（C# 14 语法、.NET 10 内置验证/OpenAPI/EF Core/Blazor/PGO）
- 结论：**全部经官方文档（Microsoft Learn、.NET Blog）与社区资料核实，确认无误**；
  并订正了「最小 API 验证」页误用的 `.WithValidation()`（实际无此 API，自动启用 + `.DisableValidation()` 关闭）
  与「Blazor JS 互操作」页补全新增的 `InvokeConstructorAsync` / 属性读写 API。全库已无 `⚠️` 标记。

## 已自修

| 日期 | 页面 | 改了什么 | 依据 |
|------|------|----------|------|
| 2026-07-09 | dotnet/* 与 patterns/* | 修正子代理写错的相对链接深度（`../sources` ↔ `../../sources`、`../../dotnet` ↔ `../dotnet`） | Lint 死链扫描 |
| 2026-07-09 | dotnet/aspnet-core/minimal-api-validation.md | 删除不存在的 `.WithValidation()`；改为 `AddValidation()` 自动启用 + `.DisableValidation()` 关闭 | Microsoft Learn / 社区资料核实 |
| 2026-07-09 | dotnet/blazor/javascript-improvements.md | 补全 .NET 10 新增 JS 互操作 API：`InvokeConstructorAsync`、JS 对象属性读写 | ASP.NET Core 10 发行说明 |
| 2026-07-09 | 11 个 .NET 10 页 | 移除全部 `⚠️ needs-your-call` 标记（语法/API 均已确认） | 官方文档联网核实 |

## 待你判定（⚠️ needs-your-call）

> 无。上一轮 11 处不确定点已通过联网核实全部确认，详情见上方「已自修」。

## 待办（Lint 发现）

- [ ] 种子页全部写完后跑首轮全量 Audit，逐页回填 Q1–Q7 判定。
- [x] 校验 `wiki/思维导图.md` 节点可点击跳转、分类清晰：已将 markmap 依赖（d3 / markmap-lib / markmap-view）本地化至 `wiki/assets/vendor/`，不再依赖被网络拦截的 CDN，可正常渲染。
