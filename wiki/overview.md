---
title: 全景
summary: 知识库总览——主题地图、快速入口与可视化导航。
tags: [overview]
introduced-in: general
applies-to: [all]
status: stable
source: AGENTS.md
updated: 2026-07-09
---

# .NET LLM Wiki · 全景

> 一个由 LLM 编译维护的 .NET / C# 知识库：编程规范、最佳实践与语法演进。
> 知识在摄入时被结构化，随贡献持续累积、互相链接、自动可视化。

## 快速导航

<div class="grid cards" markdown>

- :material-rocket-launch: **.NET 10 / C# 14**
  文件型应用、原生 AOT、`field`、`extension`、空条件赋值……
  [进入](dotnet/overview.md)

- :material-lightbulb: **核心概念**
  NRT、record、模式匹配、Span、依赖注入、异步、源生成器
  [进入](concepts/nullable-reference-types.md)

- :material-checkbox-multiple-marked: **规范与模式**
   命名、异常、日志、配置、测试；Result、Options、管道、EF Core 直接数据访问
  [进入](standards/naming.md)

- :material-alert-octagon: **反模式**
  吞异常、async void、魔法数字、阻塞异步、过早优化
  [进入](anti-patterns/swallowing-exceptions.md)

- :material-graph: **可视化**
  可导航思维导图 / 3D 关系图，点击节点直达页面
  [思维导图](思维导图.md) · [3D 图谱](知识图谱3D.md)

</div>

## 主题地图

- **语言层**：[C# 扩展成员](dotnet/csharp/extension-members.md) · [field 关键字](dotnet/csharp/field-keyword.md) · [空条件赋值](dotnet/csharp/null-conditional-assignment.md) · [nameof 非绑定泛型](dotnet/csharp/nameof-unbound-generics.md) · [隐式 Span 转换](dotnet/csharp/implicit-span-conversions.md) · [lambda 参数修饰符](dotnet/csharp/lambda-parameter-modifiers.md)
- **平台层**：[ASP.NET Core](dotnet/aspnet-core/minimal-api-validation.md) · [EF Core](dotnet/ef-core/complex-types-json.md) · [运行时](dotnet/runtime/jit-optimizations.md) · [Blazor](dotnet/blazor/javascript-improvements.md)
- **工程层**：[规范](standards/naming.md) · [模式](patterns/result-type.md) · [反模式](anti-patterns/swallowing-exceptions.md) · [对比](comparisons/record-vs-class.md)

## 怎么用

1. 浏览网页，发现不对 → 见 [如何反馈](如何反馈.md) 或提 GitHub Issue。
2. 有最新资料 → 丢进 `raw/`，由 Agent 执行 Ingest。
3. Agent 会按 [QA](QA.md) 自审、按 [POLICY](POLICY.md) 守约，并自动 commit + push。
