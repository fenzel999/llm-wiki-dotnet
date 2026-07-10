---
title: 巡检（Audit/Correct 例行流程）
summary: 人类说一句"巡检"即触发；Agent 按此清单对全库做前沿性核对、删旧换新、合规扫描与重排。
tags: [governance, patrol, audit, correct]
introduced-in: general
applies-to: [all]
status: stable
source: AGENTS.md
updated: 2026-07-10
---

# 巡检 Patrol

> **要点速览**
> - 触发方式：人类在对话里说 **"巡检"**（无法由 Agent 每 10 分钟自跑，见下）。
> - 一次巡检 = 前沿性核对 → 删旧换新 → 合规扫描 → Lint → 结构/分类优化 → 同步 → 构建 → 推送。
> - 能确证就自修并记 `qa-report`；拿不准标 `⚠️ needs-your-call` 先问人类（§4）。

## 为什么不是"每 10 分钟自动"

Agent 是交互式的，没有常驻定时器/后台进程，**无法自我每 10 分钟唤醒**。纯机械校验（构建、死链）
可交给定时 CI，但"分析知识、找最前沿写法、删旧换新"需要 LLM 推理，必须由人类一句 **"巡检"** 触发。

## 巡检清单（Agent 按序执行）

1. **读治理**：`policy.md` → `qa.md` → `qa-report.md`，载入最新约定与待办。
2. **前沿性核对**：对照微软/基金会**官方最新文档**（必要时联网搜索），逐主题找出"已被取代的旧写法"。
   例：控制器 → Minimal API；`Newtonsoft.Json` → `System.Text.Json`；`DllImport` → `LibraryImport`；
   `ISourceGenerator` → `IIncrementalGenerator`；响应缓存 → 输出缓存。
3. **删旧换新（P11）**：过时写法删除、用新写法替代；新方案无法覆盖旧场景时才保留并标注"仅用于 X"。
4. **合规扫描（P10/P12）**：全库搜第三方/付费/云绑定包（非 `Microsoft.*`/`System.*`/基金会项目、
   Azure 托管服务、Orleans、付费模块）。命中则改为手写或内置方案，无法则标 `⚠️`。
5. **Lint**：frontmatter 完整且 `source` 非空、内部链接无死链、无孤儿页、`思维导图` 节点均有效。
6. **结构/可读性（P13）**：每页有"要点速览"、固定小节、`✅/❌` 好坏代码；语言中文自然、简洁。
7. **分类优雅性**：目录/nav 是否清晰不散碎；必要时合并碎页、调整分组。
8. **同步（P9）**：更新 `index.md`、`思维导图.md`、`sources/README.md`、`log.md`、`qa-report.md`。
9. **构建**：`mkdocs build --strict` 必须零死链通过。
10. **提交**：按逻辑单元 `commit` 并 `push` 到 `main`。

## 输出

- 每次巡检在 `qa-report.md` 追加一条"巡检记录"：核对了什么、改了什么、还剩什么待判定。
- 有拿不准处：`⚠️ needs-your-call` 写入 `qa-report.md` 的"待你判定"区并停下来问人类。

## 参考

- [持久约定 POLICY](policy.md)
- [质量准则 QA](qa.md)
- [质量报告](qa-report.md)
