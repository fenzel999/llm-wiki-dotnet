---
title: 质量准则 QA
summary: 用来判断知识页对错的 7 条 Rubric；Audit 依据它主动判错并自修。
tags: [governance, qa]
introduced-in: general
applies-to: [all]
status: stable
source: AGENTS.md
updated: 2026-07-09
---

# QA — 质量准则 Rubric

Agent 执行 **Audit** 时，按以下 7 条逐页判定「对 / 错 / 存疑」，并给出理由。
任一维度不达标即视为需要 Correct。

---

## Q1 准确且可溯源
- 事实与官方文档/一手资料一致。
- frontmatter `source` 非空且真实可查。
- 无「我以为」「通常」等无依据断言。

## Q2 时效正确
- `introduced-in` / `applies-to` / `status` 与 .NET 实际版本线一致。
- 已废弃特性标 `deprecated` 并说明替代。
- 预览特性标 `preview`，不写成稳定承诺。

## Q3 一致性
- 与 `policy.md` 及其他页面不矛盾。
- 同一定义/术语在全库用法统一。
- 版本差异用选项卡呈现，不互相打架。

## Q4 平衡与对比
- 反模式/坑点明确给出正确替代（不只是「别这么做」）。
- 取舍（性能 vs 可读性等）说清适用场景。

## Q5 惯用法新颖度
- 优先展示**当前推荐**写法（见 POLICY P1）。
- 旧写法仅作背景，且标注「历史/不推荐」。

## Q6 .NET 10 / C# 14 正确性
- 涉及的 .NET 10 / C# 14 语法（file-based apps、`field`、`extension` 块、空条件赋值等）
  写法真实可编译，非臆测。
- 不确定时标 `⚠️ needs-your-call`。

## Q7 结构与可验证
- frontmatter 完整、正文分段清晰、代码可编译（POLICY P6）。
- 页面被索引/链接可达（无孤儿页）。
- 链接无死链。

---

## 判定输出格式（写入 qa-report.md）

```
### wiki/dotnet/csharp/field-keyword.md
- Q1 准确可溯源：✅ 引自 MS Docs
- Q2 时效：✅ introduced-in=net10
- Q6 .NET10 正确：✅ 示例可编译
- 结论：通过
```

存疑或错误时：结论标 `⚠️` 或 `❌`，写明理由与建议修正，并进入「待你判定 / 已自修」列表。
