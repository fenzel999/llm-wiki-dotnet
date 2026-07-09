---
title: 如何反馈
summary: 发现内容错误或要补充知识时，按此模板提交，Agent 会校正并自动 push。
tags: [governance, feedback]
introduced-in: general
applies-to: [all]
status: stable
source: AGENTS.md
updated: 2026-07-09
---

# 如何反馈（纠错 / 补充）

你（人类）只负责：**看知识、指出不对、给最新知识**。技术活交给 Agent。

## 方式一：提 GitHub Issue（推荐，可溯源）
点击仓库的 **Issues → New issue → 「知识纠错 / 补充」**，按模板填：
- **相关页面**：如 `wiki/dotnet/csharp/field-keyword.md`
- **类型**：错误 / 链接错误 / 缺页 / 补充资料
- **具体说明**：哪里错、应如何改
- **来源**：官方文档/博客链接（便于 Agent 摄入）

## 方式二：网页编辑
每页右上角有 **编辑** 按钮，可直接改并提交（会走 PR/直接提交流程）。

## 方式三：丢原始资料
把文章/论文/笔记放进 `raw/`（如 `raw/articles/xxx.md`），告诉 Agent「请 Ingest」。

## 反馈模板（复制填写也行）

```
【页面】wiki/xxx.md
【类型】内容错误 / 链接错误 / 缺页 / 补充
【说明】
  - 现状：……
  - 应为：……
【来源】https://learn.microsoft.com/...
```

## 之后会发生什么
1. Agent 收到反馈，按 [QA](./qa.md) 判定、按 [POLICY](./policy.md) 守约。
2. 能确证则直接 Correct 并写 [QA-REPORT](./qa-report.md)；拿不准标 `⚠️ needs-your-call` 先问你。
3. Agent 自动 `commit` + `push` 到 `main`，GitHub Pages 自动更新。
4. 你刷新网页即可看到修正。
