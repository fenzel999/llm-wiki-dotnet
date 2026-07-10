---
title: 弹性与容错（Resilience / Polly）
summary: 用 Microsoft.Extensions.Resilience（基于 Polly）为网络调用加重试、熔断、超时、隔离。
tags: [resilience, polly, retry, circuit-breaker, 容错]
introduced-in: net8
applies-to: [net8, net9, net10]
status: stable
source: https://learn.microsoft.com/dotnet/core/resilience/
updated: 2026-07-10
---

## 概述

分布式系统里"远程调用会失败"是常态而非意外：网络抖动、下游过载、瞬时超时。弹性（Resilience）就是让应用**优雅地承受并从这些故障中恢复**。核心策略有五种：**重试（Retry）**应对瞬时故障、**熔断（Circuit Breaker）**在下游持续失败时快速失败以免雪崩、**超时（Timeout）**避免无限等待、**限流/隔离（Rate limiter / Bulkhead）**保护自身资源、**回退（Fallback）**提供降级结果。

.NET 官方推荐 `Microsoft.Extensions.Resilience`，它构建在成熟的 **Polly v8** 之上，用"弹性管道（resilience pipeline）"把多个策略按顺序组合，并能与 `IHttpClientFactory` 无缝集成。

## 正确做法

给类型化 HttpClient 挂上标准弹性处理器，一行拿到重试+熔断+超时的合理默认：

```csharp
builder.Services.AddHttpClient<GitHubClient>()
    .AddStandardResilienceHandler();   // 重试 + 熔断 + 超时 + 限流的官方默认组合
```

需要自定义时，显式构建弹性管道：

```csharp
var pipeline = new ResiliencePipelineBuilder()
    .AddRetry(new RetryStrategyOptions
    {
        MaxRetryAttempts = 3,
        BackoffType = DelayBackoffType.Exponential,   // 指数退避
        UseJitter = true                              // 加抖动，避免重试风暴
    })
    .AddTimeout(TimeSpan.FromSeconds(10))
    .Build();

await pipeline.ExecuteAsync(async ct => await CallDownstreamAsync(ct));
```

## 常见误区

❌ 无脑固定间隔重试（且不加抖动），下游一挂，所有客户端同时重试形成"重试风暴"把它彻底压垮。用指数退避 + jitter。

❌ 对**非幂等**操作（如"扣款"）盲目重试，可能导致重复执行。重试前确认操作幂等，或配合幂等键。

❌ 只加重试不加熔断：下游长时间宕机时，每个请求都要先重试几次再失败，拖垮自己。熔断能在探测到持续失败后快速失败。

## 适用版本

`Microsoft.Extensions.Resilience` / Polly v8 面向 net8+；旧项目可直接用 Polly 库。

## 参考资料

- [HttpClient 与工厂](http-client.md)
- [微服务架构](../../architecture/microservices.md)
- 官方文档：[.NET 中的弹性复原能力](https://learn.microsoft.com/dotnet/core/resilience/)
- 官方文档：[使用 IHttpClientFactory 构建弹性 HTTP 应用](https://learn.microsoft.com/dotnet/core/resilience/http-resilience)
