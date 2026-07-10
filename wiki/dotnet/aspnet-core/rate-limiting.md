---
title: 限流（内置 Rate Limiting）
summary: net7+ 内置限流中间件，四算法按场景选，分区限流 + 429/Retry-After，兼容 AOT。
tags: [rate-limiting, throttling]
introduced-in: net7
applies-to: [net7, net8, net9, net10]
status: stable
source: https://learn.microsoft.com/aspnet/core/performance/rate-limit
updated: 2026-07-10
---

# 限流（内置 Rate Limiting）

> **要点速览**
> - net7+ 内置限流中间件（无需第三方），四算法：**固定窗口 / 滑动窗口 / 令牌桶 / 并发**。
> - 定义**命名策略** + `RequireRateLimiting`；超限返回 **429** 并给 `Retry-After`。
> - 按用户/IP/Key **分区（PartitionedRateLimiter）**，避免一个用户拖垮所有人。
> - 限流是纵深防御之一，配合[认证授权](auth.md)、[弹性](../fundamentals/resilience.md)。

## 概述

限流（Rate Limiting）是保护服务不被突发或恶意流量压垮的第一道闸门。net7 起 ASP.NET Core **内置**限流中间件（`Microsoft.AspNetCore.RateLimiting` + `System.Threading.RateLimiting`），无需第三方包。四种算法：

| 算法 | 行为 | 何时 |
|------|------|------|
| 固定窗口（Fixed Window） | 窗口内累计，窗口重置清零 | 简单场景；注意窗口边界双倍突刺 |
| 滑动窗口（Sliding Window） | 把窗口分多段，平滑过渡 | 想避免边界突刺 |
| 令牌桶（Token Bucket） | 按速率补令牌、允许突发 | 多数 API（允许短时突发） |
| 并发（Concurrency） | 限制同时处理的请求数 | 保护稀缺资源（DB 连接、下游） |

用法：定义命名策略 → 挂到全局或端点 → 超限返回 **429** + `Retry-After`。按用户/IP/Key 分区分别限流。

## 正确做法

### 1. 四种算法

```csharp
builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;

    options.AddFixedWindowLimiter("fixed", o =>     // 每 10s 最多 5 次
    { o.Window = TimeSpan.FromSeconds(10); o.PermitLimit = 5; });

    options.AddSlidingWindowLimiter("sliding", o =>  // 平滑：2 段窗口
    { o.Window = TimeSpan.FromMinutes(1); o.SegmentsPerWindow = 2; o.PermitLimit = 30; });

    options.AddTokenBucketLimiter("token", o =>      // 桶容量 100，每分钟补满
    { o.TokenLimit = 100; o.TokensPerPeriod = 100; o.ReplenishmentPeriod = TimeSpan.FromMinutes(1); });

    options.AddConcurrencyLimiter("concurrency", o => // 同时最多 10 个
    { o.PermitLimit = 10; o.QueueLimit = 0; });
});

var app = builder.Build();
app.UseRateLimiter();   // 一定在映射端点之前（但通常在授权之后）

app.MapGet("/search", () => "ok").RequireRateLimiting("token");
```

### 2. 按用户/IP 分区，避免"一人打满全员受罚"

```csharp
options.AddPolicy("api", context =>
    PartitionedRateLimiter.Create<HttpContext, string>(ctx =>
        RateLimitPartition.GetTokenBucketLimiter(
            ctx.User.Identity?.Name ?? ctx.Connection.RemoteIpAddress?.ToString() ?? "anon",
            _ => new TokenBucketRateLimiterOptions
            {
                TokenLimit = 100, TokensPerPeriod = 100,
                ReplenishmentPeriod = TimeSpan.FromMinutes(1),
            }),
        key => key));
```

### 3. 全局 + 端点级混用

全局默认策略挂 `AddRateLimiter` 的 `GlobalLimiter`；敏感端点再用 `RequireRateLimiting("strict")` 叠加更严策略。

## 常见误区

❌ **固定窗口忽略边界突刺**：窗口末+下窗口初可能瞬间放行约两倍量。要平滑用滑动窗口或令牌桶。

❌ **全局单一限流器不分区**——某用户/IP 打满后所有人被拖累。按用户/IP/Key 分区。

❌ **超限制返回 429 却不给 `Retry-After`**——客户端盲目重试加重压力。给出重试提示。

❌ **把限流当唯一防线**。它只是闸门之一，需配合[认证授权](auth.md)、[弹性](../fundamentals/resilience.md)纵深防御。

❌ **并发限流把 `QueueLimit` 设太大**——退化为无限排队，客户端干等。并发限流配合小队列或快速失败。

## 适用版本

内置限流中间件 **net7+**；net8+ 完善指标与 `PartitionedRateLimiter` 集成。net7 之前需自行实现或手写中间件。

### Native AOT 兼容性

限流中间件**兼容 Native AOT**（✅，[P16](../../governance/policy.md)、[AOT 矩阵](../aot/aot-compatibility.md)）：策略注册与评估无运行期反射。`PartitionedRateLimiter` 的 key 选择器是普通委托，AOT 安全。

## 参考资料

- [中间件管道（UseRateLimiter 位置）](middleware.md) · [弹性与容错](../fundamentals/resilience.md)
- [AOT 兼容性矩阵](../aot/aot-compatibility.md)
- 官方文档：[ASP.NET Core 限流中间件](https://learn.microsoft.com/aspnet/core/performance/rate-limit)
