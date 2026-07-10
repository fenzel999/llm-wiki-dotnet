---
title: 限流（内置 Rate Limiting）
summary: 用 net7+ 内置限流中间件保护服务，四种算法按场景选，配合 429 与 Retry-After。
tags: [rate-limiting, throttling, 限流, 保护]
introduced-in: net7
applies-to: [net7, net8, net9, net10]
status: stable
source: https://learn.microsoft.com/aspnet/core/performance/rate-limit
updated: 2026-07-10
---

## 概述

限流（Rate Limiting）是保护服务不被突发或恶意流量压垮的第一道闸门。net7 起，ASP.NET Core **内置**了限流中间件（`Microsoft.AspNetCore.RateLimiting` + `System.Threading.RateLimiting`），无需任何第三方包。它提供四种经典算法：**固定窗口（Fixed Window）**简单但边界会突刺；**滑动窗口（Sliding Window）**更平滑；**令牌桶（Token Bucket）**允许一定突发；**并发限制（Concurrency）**限制同时处理的请求数。

用法是定义命名策略，再挂到全局或具体端点。超限时默认返回 **429 Too Many Requests**，最好同时给出 `Retry-After` 头告诉客户端多久后可重试。可按用户/IP/API Key 分区（partition）分别限流，避免一个用户拖垮所有人。

## 正确做法

注册命名策略（按用户分区的令牌桶），端点应用，并配置 429 + Retry-After：

```csharp
builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    options.AddTokenBucketLimiter("api", o =>
    {
        o.TokenLimit = 100;
        o.TokensPerPeriod = 100;
        o.ReplenishmentPeriod = TimeSpan.FromMinutes(1);   // 每分钟补满，允许突发
    });
});

var app = builder.Build();
app.UseRateLimiter();

app.MapGet("/api/data", () => "ok").RequireRateLimiting("api");
```

## 常见误区

❌ 用固定窗口却忽略"窗口边界双倍突刺"（窗口末+下窗口初可能瞬间放行两倍量）。对平滑要求高时用滑动窗口或令牌桶。

❌ 全局一个限流器不分区，某个用户/IP 打满后所有人被拖累。按用户/IP/Key 分区（`PartitionedRateLimiter`）。

❌ 超限只返回 429 却不给 `Retry-After`，客户端只能盲目重试加重压力。给出重试提示。

❌ 把限流当唯一防线。它是闸门之一，需配合[认证授权](auth.md)、[弹性](../fundamentals/resilience.md)等纵深防御。

## 适用版本

内置限流中间件 net7+；net8+ 完善了指标与集成。net7 之前需自行实现或用中间件手写。

## 参考资料

- [中间件管道](middleware.md)
- [弹性与容错](../fundamentals/resilience.md)
- 官方文档：[ASP.NET Core 限流中间件](https://learn.microsoft.com/aspnet/core/performance/rate-limit)
