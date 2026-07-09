---
title: 索引
summary: 全库内容目录，按主题分组，每条一句摘要 + 链接。
tags: [index]
introduced-in: general
applies-to: [all]
status: stable
source: AGENTS.md
updated: 2026-07-09
---

# 索引 index

> 全库页面目录。每条 = 一句话摘要 + 链接。新页面必须在此登记（POLICY P9）。

## 给 AI 的使用说明

本知识库供 LLM（opencode / Claude Code）检索与维护，约定如下：

- **入口**：先读本页 `index.md`，再按需读目标页。每页顶部 YAML `frontmatter` 含
  `title` / `summary` / `tags` / `introduced-in` / `applies-to` / `status` / `source`，
  可直接用于判断与检索，**不必通读全文**。
- **分类（目录即主题，简单明确）**：
  - `dotnet/` —— .NET 10 / C# 14 及 ASP.NET Core、EF Core、运行时、Blazor 特性
  - `concepts/` —— 语言概念（NRT、record、模式匹配、Span、DI、异步、泛型…）
  - `standards/` —— 工程规范（命名、异常、日志、配置、测试、API 设计…）
  - `patterns/` —— 推荐做法（Options、管道、泛型主机、最小 API 组织、释放）
  - `anti-patterns/` —— 反模式（含 ❌ 错误 / ✅ 正确 对比）
  - `comparisons/` —— 取舍对比（record vs class 等）
  - `governance/` —— 质量准则 `qa.md`、约定 `policy.md`、报告 `qa-report.md`、反馈 `feedback.md`
  - `sources/` —— 一手来源登记
- **链接**：全程相对 Markdown 链接，GitHub / MkDocs / 网页三处均可解析。
- **质量**：内容需经 `governance/qa.md` 判定；不确定处标 `⚠️ needs-your-call`。

## .NET 8 / 9 / 10

- [.NET 总览](dotnet/overview.md) — .NET 10 / C# 14 关键主题地图
- [文件型应用](dotnet/file-based-apps.md) — .NET 10 单文件 `global using` 风格控制台应用
- [原生 AOT](dotnet/native-aot.md) — 提前编译、 trimming 与受限反射
- [C# 14 新特性](dotnet/csharp/csharp-14.md) — extension 成员、field 关键字、空条件赋值、nameof 非绑定泛型、隐式 Span 转换、lambda 参数修饰符
- [ASP.NET Core 10](dotnet/aspnet-core/aspnet-core-10.md) — 最小 API 内置验证、原生 OpenAPI 3.1
- [EF Core 10](dotnet/ef-core/ef-core-10.md) — 复杂类型与 JSON 列、命名查询筛选器
- [EF Core 数据访问](dotnet/ef-core/ef-data-access.md) — 直接用 DbContext，不引入仓储/工作单元
- [运行时 JIT 优化](dotnet/runtime/jit-optimizations.md) — .NET 10 JIT 性能改进
- [Blazor JS 改进](dotnet/blazor/javascript-improvements.md) — Blazor 与 JS 互操作增强
- 版本对照:
    - [.NET 8 / C# 12 关键知识](dotnet/versions/net8.md) — LTS；集合表达式、主构造函数、EF Core 8
    - [.NET 9 / C# 13 关键知识](dotnet/versions/net9.md) — STS；params 集合、内建 OpenAPI 3.0、Microsoft.Extensions.AI
    - [.NET 版本演进](comparisons/net-evolution.md) — 时间线、LTS/STS 与特性矩阵

## 语言与规范

### 语言概念
- [C# 现代语言特性](concepts/modern-csharp.md) — record、可空引用、泛型、模式匹配、Span/Memory、ValueTask、源生成器
- [依赖注入](concepts/dependency-injection.md) — DI 容器与生命周期
- [异步编程](concepts/async-await.md) — Task 模型与同步上下文


### 工程规范
- [命名与 API 约定](standards/coding-conventions.md) — 命名、API 设计、空处理
- [健壮性与工程质量](standards/quality-engineering.md) — 异常、日志、配置、测试、异步

## 实践

### 模式
- [组合与架构模式](patterns/composition.md) — Options / 泛型主机 / 管道行为 / 最小 API 组织
- [释放与 using](patterns/disposable-using.md) — IDisposable 与 using 声明

### 反模式
- [吞掉异常](anti-patterns/design-antipatterns.md#swallowing-exceptions) — 空 catch 吞错
- [async void](anti-patterns/async-antipatterns.md#async-void) — 无法等待的火灾
- [魔法数字](anti-patterns/design-antipatterns.md#magic-numbers) — 无含义字面量
- [上帝方法](anti-patterns/design-antipatterns.md#god-methods) — 过长过胖的函数
- [服务定位器](anti-patterns/design-antipatterns.md#service-locator) — 隐藏依赖
- [过度可变](anti-patterns/design-antipatterns.md#excessive-mutability) — 默认可变带来的 bug
- [阻塞异步](anti-patterns/async-antipatterns.md#blocking-async) — `.Result`/`.Wait()` 死锁
- [过早优化](anti-patterns/design-antipatterns.md#premature-optimization) — 未度量先优化

### 对比
- [record vs class](comparisons/record-vs-class.md) — 值语义与引用语义取舍
- [List vs ImmutableArray](comparisons/list-vs-immutablearray.md) — 可变与不可变集合
- [RAG vs LLM Wiki](comparisons/rag-vs-llm-wiki.md) — 两种知识供给范式
- [.NET 版本演进](comparisons/net-evolution.md) — 关键版本时间线与 LTS

## 治理
- [质量准则 QA](governance/qa.md) · [持久约定 POLICY](governance/policy.md) · [质量报告](governance/qa-report.md)
- [如何反馈](governance/feedback.md) · [资料索引](sources/README.md)
- [思维导图](思维导图.md)
