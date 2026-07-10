---
title: 输出缓存（Output Caching）
summary: 用 net7+ 内置输出缓存把响应缓存在服务端，按查询/头分键并支持标签失效，区别于响应缓存。
tags: [output-caching, response-caching]
introduced-in: net7
applies-to: [net7, net8, net9, net10]
status: stable
source: https://learn.microsoft.com/aspnet/core/performance/caching/output
updated: 2026-07-10
---

> **要点速览**
> - net7+ 内置输出缓存：响应存**服务端**、服务端掌控失效，通用场景**取代**响应缓存。
> - 用 `VaryBy`（`VaryByQuery`/`VaryByHeader`/`VaryByRouteValue`）分键、`Tag` 打标签；数据变更后 `EvictByTagAsync` 主动失效。
> - 默认只缓存匿名 GET/HEAD 无 Set-Cookie 的响应。
> - 个性化/带授权内容谨慎缓存或按用户分键。
> - 与 `IMemoryCache`/`HybridCache`（数据层缓存，缓存"对象"）不同：输出缓存缓存"整个 HTTP 响应"。
> - AOT：输出缓存为 ✅ AOT 兼容；但响应体走 JSON 时仍需 `System.Text.Json` **源生成**（见 `### Native AOT 兼容性`）。

## 概述

对"生成代价高、但一段时间内结果不变"的响应（如首页、榜单、报表），把整个响应缓存起来直接复用，能极大降负载。net7 起 ASP.NET Core 内置**输出缓存（Output Caching）**中间件，缓存**存在服务端**、由服务端完全掌控失效，比老的响应缓存（Response Caching，依赖客户端/代理遵守 HTTP 缓存头、不可控）更可靠——通用场景**输出缓存已取代响应缓存**（[P11](../../governance/policy.md)）。

它支持按查询字符串/请求头/路由值**分键**（VaryBy），并支持**标签（tag）失效**——给一组缓存打标签，数据变更时一次按标签清除相关缓存，解决了缓存最难的"何时失效"问题。默认只缓存匿名 GET/HEAD 且无 Set-Cookie 的响应。

### 输出缓存 vs 数据层缓存（IMemoryCache / HybridCache）

| 维度 | 输出缓存 Output Caching | `IMemoryCache` / `HybridCache` |
|------|--------------------------|-------------------------------|
| 缓存单位 | 整个 **HTTP 响应**（序列化后字节） | 业务**对象/数据**（内存或分布式） |
| 作用位置 | 中间件层，自动拦截响应 | 代码层，需手动 Get/Set |
| 失效控制 | 服务端掌控，按标签/时间 | 由代码手动 `Remove` |
| 典型用途 | 高频只读 GET（首页/榜单） | 领域计算结果、跨请求复用对象 |
| 是否需改业务代码 | 仅加 `CacheOutput` 属性 | 需包围业务调用 |

两者**不互斥**：可先在数据层用 `HybridCache` 缓存聚合结果，再用输出缓存缓存最终响应，分层降负载。

## 正确做法

### 注册、命名策略与按查询分键

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

### 三种 VaryBy：按查询 / 按头 / 按路由值

同一逻辑端点对不同输入应得到不同缓存条目，用 `VaryBy*` 分键：

```csharp
options.AddPolicy("Search", b => b
    .Expire(TimeSpan.FromMinutes(1))
    .SetVaryByQuery("q", "sort")          // 按查询参数分键（可传多个）
    .SetVaryByHeader("Accept-Language")   // 按请求头分键（多语言）
    .SetVaryByRouteValue("tenantId"));    // 按路由值分键（多租户隔离）

app.MapGet("/search", Search).CacheOutput("Search");
app.MapGet("/t/{tenantId}/report", Report).CacheOutput("Search");
```

- `SetVaryByQuery(params string[])`：按查询字符串键分键，常见 `page`/`q`/`sort`。
- `SetVaryByHeader(params string[])`：按请求头分键，如 `Accept-Language`、版本头。
- `SetVaryByRouteValue(params string[])`：按路由模板中的值分键，如 `{tenantId}`、`{locale}`。

### 策略复用与默认策略（BasePolicy）

把公共规则放进**基策略 `AddBasePolicy`**，各命名策略在其之上叠加，避免重复：

```csharp
builder.Services.AddOutputCache(options =>
{
    // 所有策略默认 60s 过期；命名策略可覆盖
    options.AddBasePolicy(b => b.Expire(TimeSpan.FromSeconds(60)));

    options.AddPolicy("Home", b => b
        .Tag("home")                       // 继承 60s，额外打标签
        .SetVaryByHeader("Accept-Encoding"));

    options.AddPolicy("LongLived", b => b
        .Expire(TimeSpan.FromHours(1))     // 覆盖基策略的过期时间
        .Tag("catalog"));
});
```

未指定命名策略、直接 `.CacheOutput()` 时，也走基策略（或内置默认）：

```csharp
app.MapGet("/ping", () => "ok").CacheOutput();   // 用基/默认策略
```

### 缓存条目选项全貌

`OutputCachePolicyBuilder` 常用配置（net7+，部分 net8+ 增强）：

| 方法 | 作用 |
|------|------|
| `Expire(TimeSpan)` | 绝对过期时间（net7+） |
| `SetVaryByQuery / Header / RouteValue` | 分键维度 |
| `Tag(params string[])` | 打标签，供 `EvictByTagAsync` 批量失效 |
| `SetCacheKeyPrefix(string)` | 给本策略的键加前缀，隔离命名空间 |
| `With(OutputCacheContext => ValueTask)` | 自定义回调（`func` 变体 net8+ 增强，可基于请求决定缓存行为） |
| `NoCache()` | 标记不缓存 |

```csharp
options.AddPolicy("Conditional", b => b
    .Expire(TimeSpan.FromMinutes(10))
    .SetCacheKeyPrefix("v1")
    .Tag("reports", "daily")
    .SetVaryByQuery("date"));
```

### 主动失效：EvictByTagAsync 与按端点清除

```csharp
// 按标签批量失效（推荐——写操作后一处清除相关缓存）
app.MapPost("/products/{id}", async (int id, IOutputCacheStore store, CancellationToken ct) =>
{
    // ... 写库 ...
    await store.EvictByTagAsync("products", ct);
    return Results.NoContent();
});

// 按具体键前缀失效（需知道完整 key 构成时）
app.MapPost("/invalidate-home", async (IOutputCacheStore store, CancellationToken ct) =>
{
    await store.EvictByTagAsync("home", ct);
});
```

`IOutputCacheStore` 由 DI 提供，是 AOT 友好的显式接口，实例化无需反射扫描。

### CacheOutput 的两种写法

- `CacheOutput()`：用基策略/默认策略。
- `CacheOutput("PolicyName")`：应用命名策略。

```csharp
app.MapGet("/a", GetA).CacheOutput();              // 默认/基策略
app.MapGet("/b", GetB).CacheOutput("Products");    // 命名策略
```

## 常见误区

❌ **新项目还用 Response Caching 做服务端缓存**。它依赖下游遵守缓存头、不可主动失效；通用场景用输出缓存取代（[P11](../../governance/policy.md)）。

❌ **缓存随用户变化的个性化响应（含 Cookie/授权）却不分键**，导致用户 A 看到用户 B 的内容。个性化内容谨慎缓存，或用 `SetVaryByHeader("Authorization")` / `SetVaryByRouteValue` 等按用户/租户分键隔离。

❌ **只设过期时间却没有主动失效手段**，数据变更后仍返回旧内容数分钟。用标签在写操作后 `EvictByTagAsync`，让缓存"写后即失效"。

❌ **误以为输出缓存会缓存 POST 响应**。默认只缓存匿名 **GET/HEAD** 且无 `Set-Cookie` 的响应；非 GET 端点不会命中输出缓存（`EvictByTagAsync` 用于失效，而非缓存写请求本身）。

❌ **把输出缓存当作数据层缓存用**。输出缓存缓存的是"序列化后的 HTTP 响应"，不是业务对象；需要复用中间计算结果应用 `HybridCache`/`IMemoryCache`（见上方对比表），二者职责不同。

❌ **多租户场景不按路由值分键**，租户 A 的请求命中租户 B 的缓存响应。用 `SetVaryByRouteValue("tenantId")` 隔离。

## 适用版本

输出缓存 net7+ 引入；标签失效、基策略、丰富 `VaryBy*` 等能力 net7+ 持续增强。响应缓存仍存在但通用场景已被输出缓存取代。

### Native AOT 兼容性

输出缓存（Output Caching）在官方 Native AOT 兼容性矩阵中为 **✅ 支持**（见 [Native AOT 兼容性矩阵与规则](../aot/aot-compatibility.md)），`AddOutputCache` / `CacheOutput` / `IOutputCacheStore.EvictByTagAsync` 均可在 `PublishAot=true` 下使用，无运行期反射热路径。

但需注意：

- ✅ 缓存中间件、策略构建、标签失效本身 AOT 安全。
- ⚠️ 若被缓存的响应体是 JSON（如 `Results.Ok(product)`），**序列化仍走 `System.Text.Json`，AOT 下必须用源生成**（`JsonSerializerContext`），否则类型元数据被裁剪、运行期抛异常。把响应所用类型纳入 JSON 源生成上下文即可。
- 建议：AOT 项目启用 `<PublishAot>true</PublishAot>`，发布后用真实请求逐个端点验证输出缓存命中且无裁剪/AOT 警告。

## 参考资料

- [缓存（数据层）](../fundamentals/caching.md)
- [中间件管道](middleware.md)
- [Native AOT 兼容性矩阵与规则](../aot/aot-compatibility.md)
- 官方文档：[ASP.NET Core 输出缓存](https://learn.microsoft.com/aspnet/core/performance/caching/output)
- 官方文档：[ASP.NET Core 对 Native AOT 的支持](https://learn.microsoft.com/aspnet/core/fundamentals/native-aot)
