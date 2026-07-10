---
title: 索引
summary: .NET / C# 知识库总目录与阅读路径——从语言特性、工程规范到 .NET 10 实践。
tags: [index]
introduced-in: general
applies-to: [all]
status: stable
source: AGENTS.md
updated: 2026-07-10
---

# .NET / C# 知识库

这是一份面向 **.NET 与 C# 开发者**的结构化知识库：既有语言与规范的基础讲解，也有 .NET 10 的新特性与工程实践。内容以「可读的长文」组织，每篇都带可运行的代码示例与反例。

## 怎么读（建议路径）

如果你是**从头建立体系**，按下面顺序读最顺：

1. **[.NET 总览](dotnet/overview.md)** —— 先建立全局地图，知道有哪些主题。
2. **[C# 现代语言特性](dotnet/csharp/modern-csharp.md)** —— record、可空引用、模式匹配、Span、泛型等串成一篇。
3. **工程规范**：[命名与 API 约定](standards/coding-conventions.md) → [健壮性与工程质量](standards/quality-engineering.md)。
4. **实践**：[组合与架构模式](patterns/composition.md) 与 [释放与 using](patterns/disposable-using.md)；同时对照 [反模式](anti-patterns/design-antipatterns.md)。
5. **.NET 10 落地**：[C# 14 新特性](dotnet/csharp/csharp-14.md)、[ASP.NET Core 10](dotnet/aspnet-core/aspnet-core-10.md)、[EF Core 10](dotnet/ef-core/ef-core-10.md)。
6. 想深入时再看 [对比](comparisons/record-vs-class.md) 与具体版本页（[.NET 8](dotnet/versions/net8.md) / [.NET 9](dotnet/versions/net9.md)）。

也可以直接从左栏导航或 [思维导图](思维导图.md) 跳到感兴趣的主题。

## 全库目录

### .NET 平台

- [.NET 总览](dotnet/overview.md) — .NET 10 / C# 14 关键主题地图
- **C# 语言**：
    - [C# 现代语言特性](dotnet/csharp/modern-csharp.md) — record、可空引用、泛型、模式匹配、Span/Memory、ValueTask、源生成器
    - [C# 14 新特性](dotnet/csharp/csharp-14.md) — extension 成员、field 关键字、空条件赋值、nameof 非绑定泛型、隐式 Span 转换、lambda 参数修饰符
    - [异步编程](dotnet/csharp/async-await.md) — Task 模型与同步上下文
    - [LINQ 查询](dotnet/csharp/linq.md) — 延迟执行、IEnumerable vs IQueryable、避免多次枚举
    - [集合选型](dotnet/csharp/collections.md) — List/Dictionary/HashSet/Frozen/Concurrent 按用途选
    - [JSON 序列化](dotnet/csharp/serialization.md) — System.Text.Json 与源生成器（替代 Newtonsoft）
    - [源生成器实战](dotnet/csharp/source-generators.md) — 增量生成器替代运行时反射、AOT 友好
- **框架基础**：
    - [依赖注入](dotnet/fundamentals/dependency-injection.md) — DI 容器与生命周期
    - [配置与 Options](dotnet/fundamentals/configuration-options.md) — 多源配置、强类型绑定与启动校验
    - [测试](dotnet/fundamentals/testing.md) — xUnit、集成测试、手写测试替身
    - [日志与可观测性](dotnet/fundamentals/observability.md) — 结构化日志、OpenTelemetry 三信号
    - [HttpClient 与工厂](dotnet/fundamentals/http-client.md) — IHttpClientFactory、避免套接字耗尽
    - [弹性与容错](dotnet/fundamentals/resilience.md) — 重试/熔断/超时（Polly）
    - [缓存](dotnet/fundamentals/caching.md) — IMemoryCache/IDistributedCache/HybridCache
    - [后台服务](dotnet/fundamentals/background-services.md) — BackgroundService / Worker
    - [安全加固与机密](dotnet/fundamentals/data-protection.md) — Data Protection、密钥环、机密管理
- **Web / Minimal API**：
    - [ASP.NET Core 10](dotnet/aspnet-core/aspnet-core-10.md) — 最小 API 内置验证、原生 OpenAPI 3.1
    - [认证与授权](dotnet/aspnet-core/auth.md) — 认证方案与基于策略的授权
    - [中间件管道](dotnet/aspnet-core/middleware.md) — 请求管道与顺序
    - [输入验证](dotnet/aspnet-core/validation.md) — DataAnnotations / 最小 API 内置验证
    - [限流](dotnet/aspnet-core/rate-limiting.md) — net7+ 内置限流四算法
    - [输出缓存](dotnet/aspnet-core/output-caching.md) — 服务端响应缓存、标签失效
    - [实时通信 SignalR](dotnet/aspnet-core/signalr.md) — 服务器推送、强类型 Hub
- **数据访问（EF Core）**：
    - [EF Core 10](dotnet/ef-core/ef-core-10.md) — 复杂类型与 JSON 列、命名查询筛选器
    - [EF Core 数据访问](dotnet/ef-core/ef-data-access.md) — 直接用 DbContext，不引入仓储/工作单元
    - [迁移 Migrations](dotnet/ef-core/migrations.md) — 版本化演进架构、生产用脚本/bundle
    - [关系建模](dotnet/ef-core/modeling-relationships.md) — 一对多/多对多、必需与可选
    - [查询性能](dotnet/ef-core/query-performance.md) — 消灭 N+1、投影、AsNoTracking、拆分查询
    - [并发控制](dotnet/ef-core/concurrency.md) — 乐观并发与 rowversion
- **AOT 与部署**：
    - [原生 AOT](dotnet/aot/native-aot.md) — 提前编译、 trimming 与受限反射
    - [文件型应用](dotnet/aot/file-based-apps.md) — .NET 10 单文件 `global using` 风格控制台应用
- **运行时**：
    - [运行时 JIT 优化](dotnet/runtime/jit-optimizations.md) — .NET 10 JIT 性能改进
- **Blazor**：
    - [Blazor JS 改进](dotnet/blazor/javascript-improvements.md) — Blazor 与 JS 互操作增强
- **版本对照**（历史版本仅保留至今仍有效的知识，EOL 者标注）：
    - [.NET Core 3.0 / 3.1 / C# 8](dotnet/versions/netcore3.md) — 现代 .NET 奠基；NRT、异步流、内置 System.Text.Json（EOL）
    - [.NET 5 / C# 9](dotnet/versions/net5.md) — 统一之版；records、顶层语句（EOL）
    - [.NET 6 / C# 10](dotnet/versions/net6.md) — 首个统一 LTS；最小托管、DateOnly/TimeOnly（EOL）
    - [.NET 7 / C# 11](dotnet/versions/net7.md) — 性能与 Native AOT；泛型数学、限流（EOL）
    - [.NET 8 / C# 12 关键知识](dotnet/versions/net8.md) — LTS；集合表达式、主构造函数、EF Core 8
    - [.NET 9 / C# 13 关键知识](dotnet/versions/net9.md) — STS；params 集合、内建 OpenAPI 3.0、Microsoft.Extensions.AI
    - [.NET 11 / C# 15 前瞻（预览）](dotnet/versions/net11.md) — 预览期；联合类型、封闭类层次、Runtime Async（生产仍用 .NET 10）
    - [.NET 版本演进](comparisons/net-evolution.md) — 时间线、LTS/STS 与特性矩阵

### 架构

- [企业级架构模式（导览）](architecture/enterprise-patterns.md) — 用微软内置 + 手写 + Minimal API 表达企业级需求（不用控制器/重抽象/付费）
- **架构风格**：[模块化单体](architecture/modular-monolith.md) · [整洁架构](architecture/clean-architecture.md) · [垂直切片](architecture/vertical-slice.md) · [微服务](architecture/microservices.md)
- **领域建模**：[DDD](architecture/ddd.md) · [领域服务与应用服务](architecture/domain-application-services.md)（DTO 手写映射） · [规约模式](architecture/specification-pattern.md)
- **横切与企业能力**：[CQRS](architecture/cqrs.md) · [事件驱动](architecture/event-driven.md) · [多租户](architecture/multi-tenancy.md) · [审计与软删除](architecture/auditing-soft-delete.md)

### 云原生

- [.NET Aspire](cloud-native/aspire.md) — 本地多服务编排与统一可观测性（开源免费、不绑定付费云）
- [容器化](cloud-native/containers.md) — 多阶段 Dockerfile / 内置容器发布、chiseled 精简镜像
- [健康检查](cloud-native/health-checks.md) — liveness / readiness 探针

### 性能与诊断

- [基准测试](performance/benchmarking.md) — BenchmarkDotNet，先测量再优化
- [GC 与内存](performance/gc-memory.md) — 分代 GC、减少分配、Span/池化
- [诊断与剖析](performance/diagnostics.md) — dotnet-counters/trace/dump 生产取证

### 工程规范

- [命名与 API 约定](standards/coding-conventions.md) — 命名、API 设计、空处理
- [健壮性与工程质量](standards/quality-engineering.md) — 异常、日志、配置、测试、异步

### 实践

- [组合与架构模式](patterns/composition.md) — Options / 泛型主机 / 管道行为 / 最小 API 组织
- [释放与 using](patterns/disposable-using.md) — IDisposable 与 using 声明
- 反模式：[吞掉异常](anti-patterns/design-antipatterns.md#swallowing-exceptions) · [async void](anti-patterns/async-antipatterns.md#async-void) · [魔法数字](anti-patterns/design-antipatterns.md#magic-numbers) · [上帝方法](anti-patterns/design-antipatterns.md#god-methods) · [服务定位器](anti-patterns/design-antipatterns.md#service-locator) · [过度可变](anti-patterns/design-antipatterns.md#excessive-mutability) · [阻塞异步](anti-patterns/async-antipatterns.md#blocking-async) · [过早优化](anti-patterns/design-antipatterns.md#premature-optimization)
- 对比：[record vs class](comparisons/record-vs-class.md) · [List vs ImmutableArray](comparisons/list-vs-immutablearray.md) · [EF Core vs ADO.NET](comparisons/ef-vs-ado.md) · [RAG vs LLM Wiki](comparisons/rag-vs-llm-wiki.md) · [.NET 版本演进](comparisons/net-evolution.md)

### 治理

- [质量准则 QA](governance/qa.md) · [持久约定 POLICY](governance/policy.md) · [巡检流程](governance/patrol.md) · [质量报告](governance/qa-report.md)
- [如何反馈](governance/feedback.md) · [资料索引](sources/README.md)
- [思维导图](思维导图.md)

---

## 给 AI（Agent）的使用说明

> 本知识库同时供 LLM（opencode / Claude Code）检索与维护，约定如下：

- **入口**：先读本页 `index.md`，再按需读目标页。每页顶部 YAML `frontmatter` 含
  `title` / `summary` / `tags` / `introduced-in` / `applies-to` / `status` / `source`，
  可直接用于判断与检索，**不必通读全文**。
- **分类（目录即主题）**：
    - `dotnet/` —— .NET 平台知识树，按技术子域分文件夹：
        - `dotnet/csharp/` —— C# 语言（现代特性、C# 14、异步、LINQ、集合、序列化）
        - `dotnet/fundamentals/` —— 框架基础（DI、配置、测试、可观测性、HttpClient、弹性、缓存、后台服务）
        - `dotnet/aspnet-core/` —— Web / Minimal API（含认证授权、中间件）
        - `dotnet/ef-core/` —— 数据访问（EF Core：迁移、关系、性能、并发）
        - `dotnet/aot/` —— AOT 与部署（Native AOT、文件型应用）
        - `dotnet/runtime/` —— 运行时（JIT…）
        - `dotnet/blazor/` —— Blazor
        - `dotnet/versions/` —— 各版本关键知识（net8 / net9…）
    - `architecture/` —— 架构方向（风格：模块化单体/整洁/垂直切片/微服务；建模：DDD/领域应用服务/规约；能力：CQRS/事件驱动/多租户/审计软删除；导览：企业级架构模式）
    - `cloud-native/` —— 云原生（Aspire、容器化、健康检查）
    - `performance/` —— 性能与诊断（基准测试、GC/内存、诊断工具）
    - `standards/` —— 工程规范（命名、异常、日志、配置、测试、API 设计…）
    - `patterns/` —— 推荐做法（Options、管道、泛型主机、最小 API 组织、释放）
    - `anti-patterns/` —— 反模式（含 ❌ 错误 / ✅ 正确 对比）
    - `comparisons/` —— 取舍对比（record vs class 等）
    - `governance/` —— 质量准则 `qa.md`、约定 `policy.md`、巡检 `patrol.md`、报告 `qa-report.md`、反馈 `feedback.md`
    - `sources/` —— 一手来源登记
- **链接**：全程相对 Markdown 链接，GitHub / MkDocs / 网页三处均可解析。
- **质量**：内容需经 `governance/qa.md` 判定；不确定处标 `⚠️ needs-your-call`。
- **新页面**：必须在本索引登记（POLICY P9）。
