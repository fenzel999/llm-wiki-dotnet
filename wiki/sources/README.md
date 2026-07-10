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

### 后端核心工程
- [.NET 测试](https://learn.microsoft.com/dotnet/core/testing/) · [ASP.NET Core 集成测试](https://learn.microsoft.com/aspnet/core/test/integration-tests) — Microsoft Learn
- [.NET OpenTelemetry 可观测性](https://learn.microsoft.com/dotnet/core/diagnostics/observability-with-otel) · [日志记录](https://learn.microsoft.com/dotnet/core/extensions/logging) — Microsoft Learn
- [配置](https://learn.microsoft.com/dotnet/core/extensions/configuration) · [Options 模式](https://learn.microsoft.com/dotnet/core/extensions/options) — Microsoft Learn
- [HttpClient 准则](https://learn.microsoft.com/dotnet/fundamentals/networking/http/httpclient-guidelines) · [IHttpClientFactory](https://learn.microsoft.com/dotnet/fundamentals/networking/http/httpclient-factory) — Microsoft Learn
- [.NET 弹性复原能力](https://learn.microsoft.com/dotnet/core/resilience/)（Polly，.NET 基金会）— Microsoft Learn
- [ASP.NET Core 缓存](https://learn.microsoft.com/aspnet/core/performance/caching/overview) · [HybridCache](https://learn.microsoft.com/aspnet/core/performance/caching/hybrid) — Microsoft Learn
- [托管服务 / Worker](https://learn.microsoft.com/dotnet/core/extensions/workers) — Microsoft Learn
- [ASP.NET Core 安全性](https://learn.microsoft.com/aspnet/core/security/) · [中间件](https://learn.microsoft.com/aspnet/core/fundamentals/middleware/) — Microsoft Learn
- [SignalR 简介](https://learn.microsoft.com/aspnet/core/signalr/introduction) · [限流中间件](https://learn.microsoft.com/aspnet/core/performance/rate-limit) — Microsoft Learn
- [模型验证](https://learn.microsoft.com/aspnet/core/mvc/models/validation) · [最小 API 验证](https://learn.microsoft.com/aspnet/core/fundamentals/minimal-apis/validation) — Microsoft Learn
- [输出缓存](https://learn.microsoft.com/aspnet/core/performance/caching/output) · [Data Protection](https://learn.microsoft.com/aspnet/core/security/data-protection/introduction) — Microsoft Learn
- [源生成器概述](https://learn.microsoft.com/dotnet/csharp/roslyn-sdk/source-generators-overview) — Microsoft Learn

### C# 与标准库
- [LINQ](https://learn.microsoft.com/dotnet/csharp/linq/) · [集合](https://learn.microsoft.com/dotnet/standard/collections/) — Microsoft Learn
- [System.Text.Json](https://learn.microsoft.com/dotnet/standard/serialization/system-text-json/) — Microsoft Learn

### 数据访问
- [EF Core 迁移](https://learn.microsoft.com/ef/core/managing-schemas/migrations/) · [关系](https://learn.microsoft.com/ef/core/modeling/relationships) — Microsoft Learn
- [EF Core 高效查询](https://learn.microsoft.com/ef/core/performance/efficient-querying) · [并发](https://learn.microsoft.com/ef/core/saving/concurrency) — Microsoft Learn
- [ADO.NET 概述](https://learn.microsoft.com/dotnet/framework/data/adonet/) — Microsoft Learn

### 架构
- [常见 Web 应用体系结构](https://learn.microsoft.com/dotnet/architecture/modern-web-apps-azure/common-web-application-architectures) — Microsoft Learn
- [.NET 微服务架构](https://learn.microsoft.com/dotnet/architecture/microservices/) · [DDD/CQRS 模式](https://learn.microsoft.com/dotnet/architecture/microservices/microservice-ddd-cqrs-patterns/) — Microsoft Learn
- [EF Core 全局查询筛选器](https://learn.microsoft.com/ef/core/querying/filters) · [EF Core 拦截器](https://learn.microsoft.com/ef/core/logging-events-diagnostics/interceptors) — Microsoft Learn
- [ABP 架构文档（仅思想来源，不引其包）](https://abp.io/docs/latest/framework/architecture/domain-driven-design) · [多租户](https://abp.io/docs/latest/framework/architecture/multi-tenancy) · [规约](https://abp.io/docs/latest/framework/architecture/domain-driven-design/specifications) — ABP 官方文档

### 云原生与性能
- [.NET Aspire](https://learn.microsoft.com/dotnet/aspire/) — Microsoft Learn
- [容器化 .NET 应用](https://learn.microsoft.com/dotnet/core/docker/build-container) · [健康检查](https://learn.microsoft.com/aspnet/core/host-and-deploy/health-checks) — Microsoft Learn
- [.NET 垃圾回收](https://learn.microsoft.com/dotnet/standard/garbage-collection/) · [诊断工具](https://learn.microsoft.com/dotnet/core/diagnostics/) — Microsoft Learn

## 本地原始资料

- `raw/` — 用户投放的不可变原始资料（文章 / 论文 / 素材）统一放此处，由 Agent 执行 Ingest 编译进 `wiki/`。

> 新增来源时在此登记，并在对应 wiki 页 `source` 字段引用，保证可溯源（POLICY P3）。
