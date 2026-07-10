---
title: 输出缓存（Output Caching）
summary: 用 net7+ 内置输出缓存把响应缓存在服务端，按查询/头分键并支持标签失效，区别于响应缓存。
tags: [output-caching, response-caching, 缓存, 性能]
introduced-in: net7
applies-to: [net7, net8, net9, net10]
status: stable
source: https://learn.microsoft.com/aspnet/core/performance/caching/output
updated: 2026-07-10
---

## 概述

对"生成代价高、但一段时间内结果不变"的响应（如首页、榜单、报表），把整个响应缓存起来直接复用，能极大降负载。net7 起 ASP.NET Core 内置**输出缓存（Output Caching）**中间件，缓存**存在服务端**、由服务端完全掌控失效，比老的响应缓存（Response Caching，依赖客户端/代理遵守 HTTP 缓存头、不可控）更可靠——通用场景**输出缓存已取代响应缓存**（[P11](../../governance/policy.md)）。

它支持按查询字符串/请求头**分键**（VaryBy），并支持**标签（tag）失效**——给一组缓存打标签，数据变更时一次按标签清除相关缓存，解决了缓存最难的"何时失效"问题。默认只缓存匿名 GET/HEAD 且无 Set-Cookie 的响应。

## 正确做法

注册输出缓存与命名策略（按查询分键 + 打标签），端点应用；数据变更时按标签失效：

```csharp
builder.Services.AddOutputCache(options =>
{
    options.AddPolicy("Products", b => b
        .Expire(TimeSpan.FromMinutes(5))
        .SetVaryByQuery("page")        // 按分页参数分别缓存
        .Tag("products"));             // 打标签，便于批量失效
});

var app = builder.Build();
app.UseOutputCache();

app.MapGet("/products", GetProducts).CacheOutput("Products");

// 商品变更后，一次清除所有带 products 标签的缓存
app.MapPost("/products", async (IOutputCacheStore store, CancellationToken ct) =>
{
    await store.EvictByTagAsync("products", ct);
});
```

## 常见误区

❌ 新项目还用 Response Caching 做服务端缓存。它依赖下游遵守缓存头、不可主动失效；通用场景用输出缓存取代。

❌ 缓存了随用户变化的个性化响应（含 Cookie/授权）却不分键，导致用户 A 看到用户 B 的内容。个性化内容谨慎缓存或按用户分键。

❌ 设了过期时间却没有主动失效手段，数据变更后仍返回旧内容数分钟。用标签在写操作后 `EvictByTagAsync`。

## 适用版本

输出缓存 net7+；标签失效等能力 net7+ 持续增强。响应缓存仍存在但通用场景已被输出缓存取代。

## 参考资料

- [缓存（数据层）](../fundamentals/caching.md)
- [中间件管道](middleware.md)
- 官方文档：[ASP.NET Core 输出缓存](https://learn.microsoft.com/aspnet/core/performance/caching/output)
