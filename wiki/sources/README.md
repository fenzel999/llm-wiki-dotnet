---
title: 资料索引
summary: 知识库引用的原始资料（官方文档/博客/论文）登记处，供溯源与 Ingest。
tags: [sources, index]
introduced-in: general
applies-to: [all]
status: stable
source: AGENTS.md
updated: 2026-07-09
---

# 资料索引 sources

本目录登记所有被 `wiki/` 页面引用的**一手来源**。每条来源对应一个短条目，
页面 frontmatter 的 `source` 指向这里（或外部 URL）。

## 外部一手来源（精选）

- [.NET 10 发布公告](https://devblogs.microsoft.com/dotnet/announcing-dotnet-10/) — 2025-11-11
- [C# 14 新特性](https://learn.microsoft.com/dotnet/csharp/whats-new/csharp-14) — Microsoft Learn
- [文件型应用（file-based apps）](https://learn.microsoft.com/dotnet/core/tutorials/top-level-template) — Microsoft Learn
- [原生 AOT 部署](https://learn.microsoft.com/dotnet/core/deploying/native-aot) — Microsoft Learn
- [ASP.NET Core 最小 API](https://learn.microsoft.com/aspnet/core/fundamentals/minimal-apis) — Microsoft Learn
- [EF Core 复杂类型](https://learn.microsoft.com/ef/core/modeling/complex-types) — Microsoft Learn
- [可空引用类型](https://learn.microsoft.com/dotnet/csharp/nullable-references) — Microsoft Learn
- [源生成器](https://learn.microsoft.com/dotnet/csharp/roslyn-sdk/source-generators-overview) — Microsoft Learn
- [What's new in .NET Core 3.0](https://learn.microsoft.com/dotnet/core/whats-new/dotnet-core-3-0) — Microsoft Learn
- [What's new in .NET Core 3.1](https://learn.microsoft.com/dotnet/core/whats-new/dotnet-core-3-1) — Microsoft Learn
- [What's new in .NET 5](https://learn.microsoft.com/dotnet/core/whats-new/dotnet-5) — Microsoft Learn
- [What's new in .NET 6](https://learn.microsoft.com/dotnet/core/whats-new/dotnet-6) — Microsoft Learn
- [What's new in .NET 7](https://learn.microsoft.com/dotnet/core/whats-new/dotnet-7) — Microsoft Learn
- [.NET 版本演进（LTS/STS 支持策略）](https://dotnet.microsoft.com/platform/support/policy/dotnet-core) — Microsoft

## 本地原始资料

- `raw/` — 用户投放的不可变原始资料（文章 / 论文 / 素材）统一放此处，由 Agent 执行 Ingest 编译进 `wiki/`。

> 新增来源时在此登记，并在对应 wiki 页 `source` 字段引用，保证可溯源（POLICY P3）。
