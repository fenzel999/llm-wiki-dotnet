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

也可以直接从左栏导航跳到感兴趣的主题。

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
    - **对比**：[record vs class](comparisons/record-vs-class.md) · [List vs ImmutableArray](comparisons/list-vs-immutablearray.md)
- **框架基础**：
    - [依赖注入](dotnet/fundamentals/dependency-injection.md) — DI 容器与生命周期
    - [配置与 Options](dotnet/fundamentals/configuration-options.md) — 多源配置、强类型绑定与启动校验
    - [测试](dotnet/fundamentals/testing.md) — xUnit、集成测试、手写测试替身
    - [集成测试](dotnet/fundamentals/integration-testing.md) — WebApplicationFactory / SQLite 内存库测真链路
    - [测试替身](dotnet/fundamentals/test-doubles.md) — 手写 fake/stub/spy，不引 mock 框架
    - [日志与可观测性](dotnet/fundamentals/observability.md) — 结构化日志、OpenTelemetry 三信号
    - [HttpClient 与工厂](dotnet/fundamentals/http-client.md) — IHttpClientFactory、避免套接字耗尽
    - [弹性与容错](dotnet/fundamentals/resilience.md) — 重试/熔断/超时（Polly）
    - [缓存](dotnet/fundamentals/caching.md) — IMemoryCache/IDistributedCache/HybridCache
    - [后台服务](dotnet/fundamentals/background-services.md) — BackgroundService / Worker
    - [安全加固与机密](dotnet/fundamentals/data-protection.md) — Data Protection、密钥环、机密管理
    - [命名与 API 约定](standards/coding-conventions.md) — 命名、API 设计、空处理
    - [健壮性与工程质量](standards/quality-engineering.md) — 异常、日志、配置、测试、异步
    - [释放与 using](patterns/disposable-using.md) — IDisposable 与 using 声明
    - [异步反模式](anti-patterns/async-antipatterns.md) — async void、阻塞异步、服务定位器
- **Web / Minimal API**：
    - [ASP.NET Core 10](dotnet/aspnet-core/aspnet-core-10.md) — 最小 API 内置验证、原生 OpenAPI 3.1
    - [认证与授权](dotnet/aspnet-core/auth.md) — 认证方案与基于策略的授权
    - [中间件管道](dotnet/aspnet-core/middleware.md) — 请求管道与顺序
    - [全局异常处理](dotnet/aspnet-core/exception-handling.md) — IExceptionHandler + ProblemDetails 统一错误响应
    - [输入验证](dotnet/aspnet-core/validation.md) — DataAnnotations / 最小 API 内置验证
    - [限流](dotnet/aspnet-core/rate-limiting.md) — net7+ 内置限流四算法
    - [输出缓存](dotnet/aspnet-core/output-caching.md) — 服务端响应缓存、标签失效
    - [实时通信 SignalR](dotnet/aspnet-core/signalr.md) — 服务器推送、强类型 Hub
- **数据访问（EF Core）**：
    - [EF Core 10](dotnet/ef-core/ef-core-10.md) — 复杂类型与 JSON 列、命名查询筛选器
    - [EF Core 数据访问](dotnet/ef-core/ef-data-access.md) — 直接用 DbContext，不引入仓储/工作单元
    - [分页查询与动态排序](dotnet/ef-core/pagination.md) — PagedResult + 白名单动态排序，应用层职责
    - [迁移 Migrations](dotnet/ef-core/migrations.md) — 版本化演进架构、生产用脚本/bundle
    - [关系建模](dotnet/ef-core/modeling-relationships.md) — 一对多/多对多、必需与可选
    - [查询性能](dotnet/ef-core/query-performance.md) — 消灭 N+1、投影、AsNoTracking、拆分查询
    - [并发控制](dotnet/ef-core/concurrency.md) — 乐观并发与 rowversion
    - [EF Core vs ADO.NET](comparisons/ef-vs-ado.md) — 何时用哪个
- **AOT 与部署**：
    - [原生 AOT](dotnet/aot/native-aot.md) — 提前编译、 trimming 与受限反射
    - [AOT 兼容性矩阵与规则](dotnet/aot/aot-compatibility.md) — 后端严格 AOT 的落地清单与源生成替换
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
- **系统形态（System-Level）**：[模块化单体](architecture/modular-monolith.md) · [整洁架构（模块内分层）](architecture/clean-architecture.md) · [解决方案分层与项目引用](architecture/solution-structure.md) · [垂直切片](architecture/vertical-slice.md) · [微服务](architecture/microservices.md) · [组合与架构模式](patterns/composition.md)
- **模块内部（Module-Internal）**：[DDD](architecture/ddd.md) · [实体与聚合根](architecture/entities.md)（标识/UUIDv7/一致性边界） · [值对象](architecture/value-objects.md)（不可变/按值相等/record） · [领域服务与应用服务](architecture/domain-application-services.md)（DTO 手写映射） · [数据传输对象 (DTO)](architecture/dto.md)（输入/输出分离 + 分页载体 + 上限校验） · [领域事件](architecture/domain-events.md)（聚合收集 + 随工作单元分发） · [规约模式](architecture/specification-pattern.md)
- **横切能力（Cross-Cutting）**：[CQRS](architecture/cqrs.md) · [事件驱动](architecture/event-driven.md) · [多租户](architecture/multi-tenancy.md) · [审计与软删除](architecture/auditing-soft-delete.md) · [设计与可维护性反模式](anti-patterns/design-antipatterns.md)
- **架构决策记录 (ADR)**: [ADR 模板与实践](architecture/adr.md) · [API 设计模式](architecture/api-design.md)
- **部署与编排（Deployment）**：[.NET Aspire](cloud-native/aspire.md) · [容器化](cloud-native/containers.md) · [健康检查](cloud-native/health-checks.md) · [AOT CI/CD 与交叉编译](deployment/aot-ci-cd.md)

### 性能与诊断

- [基准测试](performance/benchmarking.md) — BenchmarkDotNet，先测量再优化
- [GC 与内存](performance/gc-memory.md) — 分代 GC、减少分配、Span/池化
- [诊断与剖析](performance/diagnostics.md) — dotnet-counters/trace/dump 生产取证
- [AOT 性能工程](performance/aot-performance.md) — JIT vs AOT 决策矩阵、静态 PGO、SIMD、COW 内存共享

### 治理与操作日志

- [持久约定 POLICY](governance/policy.md) · [如何反馈](governance/feedback.md) · [资料索引](sources/README.md)
- [操作日志](log.md) — 历次 Ingest / Audit / Correct 记录
- [RAG vs LLM Wiki](comparisons/rag-vs-llm-wiki.md) — 本库方法论：为何用编译知识而非 RAG

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
    - `standards/` / `patterns/` / `anti-patterns/` / `comparisons/` —— 工程规范、推荐做法、反模式、取舍对比；导航中已按主题并入「.NET 框架基础 / 架构」与版本对照，不再单列顶级分组
    - `governance/` —— 持久约定 `policy.md`、反馈 `feedback.md`
    - `sources/` —— 一手来源登记
- **链接**：全程相对 Markdown 链接，GitHub / MkDocs / 网页三处均可解析。
- **质量**：内容需经 `governance/policy.md` 判定；不确定处标 `⚠️ needs-your-call` 并记入 `log.md`（操作日志）。
- **新页面**：必须在本索引登记（POLICY P9）。
