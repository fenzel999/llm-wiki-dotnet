---
title: 弹性与容错（Resilience / Polly）
summary: 用 Microsoft.Extensions.Resilience（基于 Polly）为网络调用加重试、熔断、超时、隔离。
tags: [resilience, polly, retry, circuit-breaker]
introduced-in: net8
applies-to: [net8, net9, net10]
status: stable
source: https://learn.microsoft.com/dotnet/core/resilience/
updated: 2026-07-10
---

> **要点速览**
> - 五策略：重试、熔断、超时、限流/隔离、回退；用 `Microsoft.Extensions.Resilience`（基于 Polly，基金会）。
> - 类型化 HttpClient 一行 `AddStandardResilienceHandler()` 拿到合理默认。
> - 重试要**指数退避 + jitter**，避免重试风暴；只对**幂等**操作重试。
> - 只重试不熔断会拖垮自己；下游持续失败时熔断快速失败。

## 概述

分布式系统里"远程调用会失败"是常态而非意外：网络抖动、下游过载、瞬时超时。弹性（Resilience）就是让应用**优雅地承受并从这些故障中恢复**。核心策略有五种：**重试（Retry）**应对瞬时故障、**熔断（Circuit Breaker）**在下游持续失败时快速失败以免雪崩、**超时（Timeout）**避免无限等待、**限流/隔离（Rate limiter / Bulkhead）**保护自身资源、**回退（Fallback）**提供降级结果。

.NET 官方推荐 `Microsoft.Extensions.Resilience`，它构建在成熟的 **Polly v8** 之上，用"弹性管道（resilience pipeline）"把多个策略按顺序组合，并能与 `IHttpClientFactory` 无缝集成。

## 正确做法

`Microsoft.Extensions.Resilience`（基于 Polly v8）用"弹性管道（resilience pipeline）"把多个策略按顺序组合，并能与 [HttpClient 与工厂](http-client.md) 无缝集成。下面逐一展开五种策略，再讲如何组合。

### 标准弹性处理器（AddStandardResilienceHandler）

给类型化 HttpClient 一行拿到**重试 + 熔断 + 超时 + 限流**的官方合理默认，零配置即可用：

```csharp
builder.Services.AddHttpClient<GitHubClient>()
    .AddStandardResilienceHandler();   // 重试 + 熔断 + 超时 + 限流的官方默认组合
```

### 重试（Retry）

应对瞬时故障（网络抖动、503）。**务必指数退避 + jitter**，避免"重试风暴"；且只对**幂等**操作重试：

```csharp
var retry = new ResiliencePipelineBuilder()
    .AddRetry(new RetryStrategyOptions
    {
        MaxRetryAttempts = 3,
        BackoffType = DelayBackoffType.Exponential,   // 指数退避
        UseJitter = true                              // 加抖动，错开各客户端重试
    })
    .Build();
```

### 熔断（Circuit Breaker）

下游持续失败时**快速失败**以免雪崩。Polly v8 的熔断会统计失败率，超阈值后"开路"，一段时间后再试探：

```csharp
var breaker = new ResiliencePipelineBuilder()
    .AddCircuitBreaker(new CircuitBreakerStrategyOptions
    {
        FailureRatio = 0.5,                  // 失败率超过 50%
        SamplingDuration = TimeSpan.FromSeconds(30),
        MinimumThroughput = 20,              // 采样窗口内至少 20 次调用才有意义
        BreakDuration = TimeSpan.FromSeconds(15)  // 开路 15 秒后转半开试探
    })
    .Build();
```

### 超时（Timeout）

避免无限等待占用连接与线程。可给整体设上限：

```csharp
var timeout = new ResiliencePipelineBuilder()
    .AddTimeout(TimeSpan.FromSeconds(10))   // 超过 10 秒直接取消
    .Build();
```

### 限流（Rate limiter）

保护自己不被突发流量压垮，限制并发/速率。用 `AddRateLimiter` + `RateLimiter`：

```csharp
using System.Threading.RateLimiting;

var rateLimiter = new ResiliencePipelineBuilder()
    .AddRateLimiter(new RateLimiterStrategyOptions
    {
        RateLimiter = new SlidingWindowRateLimiter(new SlidingWindowRateLimiterOptions
        {
            PermitLimit = 100,
            SegmentsPerWindow = 4,
            Window = TimeSpan.FromSeconds(1)
        })
    })
    .Build();
```

### 隔离舱（Bulkhead）

把下游调用限制在一组**固定并发槽**里，隔离故障资源，避免一个慢下游拖垮整个进程：

```csharp
var bulkhead = new ResiliencePipelineBuilder()
    .AddConcurrencyLimiter(permitLimit: 10, queueLimit: 5)  // 最多 10 并发 + 5 排队
    .Build();
```

`AddConcurrencyLimiter` 是隔离舱的简化写法；`permitLimit` 是并发上限，`queueLimit` 是超额时的排队长度（0 表示直接拒绝）。

### 回退（Fallback）

下游彻底不可用时提供**降级结果**，而不是抛异常给用户：

```csharp
var fallback = new ResiliencePipelineBuilder()
    .AddFallback(new FallbackStrategyOptions<User>
    {
        FallbackAction = _ => ValueTask.FromResult(new User { Name = "缓存/默认值" })
    })
    .Build();
```

### 组合成管道

真实场景一般**叠加多策略**，顺序即执行顺序（外层先执行，超时/熔断应在重试之内）：

```csharp
var pipeline = new ResiliencePipelineBuilder()
    .AddRetry(new RetryStrategyOptions
    {
        MaxRetryAttempts = 3,
        BackoffType = DelayBackoffType.Exponential,
        UseJitter = true
    })
    .AddCircuitBreaker(new CircuitBreakerStrategyOptions
    {
        FailureRatio = 0.5,
        MinimumThroughput = 20,
        BreakDuration = TimeSpan.FromSeconds(15)
    })
    .AddTimeout(TimeSpan.FromSeconds(10))
    .Build();

await pipeline.ExecuteAsync(async ct => await CallDownstreamAsync(ct));
```

### 五种策略如何选（决策表）

| 故障场景 | 用哪个策略 | 说明 |
|----------|-----------|------|
| 偶发瞬时失败（网络抖动、503） | 重试 | 指数退避 + jitter，仅限幂等操作 |
| 下游持续宕机 | 熔断 | 快速失败，给下游喘息，避免雪崩 |
| 调用可能长时间挂起 | 超时 | 设上限立刻取消，释放连接 |
| 突发流量/自我保护 | 限流 | 限制速率，丢弃超额请求 |
| 单个慢下游拖垮全局 | 隔离舱 | 限定并发槽，故障隔离 |
| 彻底不可用需兜底 | 回退 | 返回降级/缓存结果而非异常 |

组合建议：**重试 + 熔断 + 超时**是最常见三角；限流/隔离舱保护资源；回退做最后兜底。

## 常见误区

❌ 无脑固定间隔重试（且不加抖动），下游一挂，所有客户端同时重试形成"重试风暴"把它彻底压垮。用指数退避 + jitter。

❌ 对**非幂等**操作（如"扣款"）盲目重试，可能导致重复执行。重试前确认操作幂等，或配合幂等键。

❌ 只加重试不加熔断：下游长时间宕机时，每个请求都要先重试几次再失败，拖垮自己。熔断能在探测到持续失败后快速失败。

❌ 把超时放在重试**之外/之前**：若超时被重试包裹，每次重试都重新计时会无限拉长总耗时；正确做法是让超时成为"单次尝试"的上限（重试内部），避免最坏情况累积爆炸。

❌ 用回退吞掉所有异常却不记日志：降级虽然保住了用户，但故障被静默掩盖，运维无从知晓。回退分支务必记录日志/指标（见 [可观测性](observability.md)）。

❌ 认为弹性策略能修"代码 bug"。它们只应对**瞬时/外部**故障；逻辑错误（400 参数错误、空引用）不该重试，重试只是重复失败并放大负载。

## 适用版本

`Microsoft.Extensions.Resilience` / Polly v8 面向 net8+；`AddCircuitBreaker` / `AddTimeout` / `AddConcurrencyLimiter` / `AddRateLimiter` / `AddFallback` 均为 net8+ 提供的策略 API；旧项目可直接用 Polly 库（同类 API）。

### Native AOT 兼容性

- ✅ **AOT 安全**：`Microsoft.Extensions.Resilience`（基于 Polly v8）的弹性管道在**编译期组合并编译**，不需要运行期反射或动态代码生成；类型化/命名 HttpClient 上的弹性处理器同样静态可用。
- 在自定义 `FallbackAction` 或策略回调里不要用反射构造对象；保持逻辑编译期可确定，以免被 AOT 裁剪。
- 若策略涉及 JSON 序列化（如回退体），用 `System.Text.Json` 源生成，不走反射。
- 详见后端 AOT 落地清单：[Native AOT 兼容性矩阵与规则](../aot/aot-compatibility.md)。

## 参考资料

- [HttpClient 与工厂](http-client.md)
- [微服务架构](../../architecture/microservices.md)
- 官方文档：[.NET 中的弹性复原能力](https://learn.microsoft.com/dotnet/core/resilience/)
- 官方文档：[使用 IHttpClientFactory 构建弹性 HTTP 应用](https://learn.microsoft.com/dotnet/core/resilience/http-resilience)
