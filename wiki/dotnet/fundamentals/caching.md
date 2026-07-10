---
title: 缓存（IMemoryCache / IDistributedCache / HybridCache）
summary: 本地内存缓存、分布式缓存与 net9 引入的 HybridCache 两级缓存及其防击穿能力。
tags: [caching, memorycache, distributedcache, hybridcache]
introduced-in: general
applies-to: [net8, net9, net10]
status: stable
source: https://learn.microsoft.com/aspnet/core/performance/caching/overview
updated: 2026-07-10
---

> **要点速览**
> - 三层：`IMemoryCache`（最快、单进程）、`IDistributedCache`（跨实例）、`HybridCache`（两级+防击穿）。
> - 新项目首选 **`HybridCache`**，`GetOrCreateAsync` 并发缺失时回源只跑一次。
> - 每个条目要有过期策略与失效手段，别"永不过期"。
> - 内存缓存要设大小上限，别塞巨大对象撑爆内存。

## 概述

缓存的本质是"用空间换时间"：把昂贵计算或慢查询的结果暂存起来，避免重复付出代价。.NET 提供三个层次：**`IMemoryCache`** 存在单进程内存里，最快但不跨实例、重启即失；**`IDistributedCache`** 存在 Redis/SQL Server 等外部存储，跨实例共享但有网络开销；net9 引入的 **`HybridCache`** 把两者合成"L1 本地 + L2 分布式"的两级缓存，并内置了单机的关键能力——**防缓存击穿（stampede protection）**：同一个 key 并发缺失时只让一个请求去回源，其余等待复用结果。

选择原则：单实例或可容忍不一致 → `IMemoryCache`；多实例需共享 → 分布式；既要快又要跨实例、还怕击穿 → `HybridCache`（推荐新项目首选）。

## 正确做法

`HybridCache` 用 `GetOrCreateAsync` 一步完成"命中就返回、未命中就回源并写入"，回源工厂天然只跑一次：

```csharp
builder.Services.AddHybridCache();

public class ProductService(HybridCache cache, IProductRepo repo)
{
    public async Task<Product> GetAsync(int id, CancellationToken ct)
        => await cache.GetOrCreateAsync(
            $"product:{id}",
            async token => await repo.LoadAsync(id, token),   // 缺失时才执行，且并发下只执行一次
            cancellationToken: ct);
}
```

设置合理的过期策略，并给键加统一前缀便于管理与失效：

```csharp
var options = new HybridCacheEntryOptions { Expiration = TimeSpan.FromMinutes(10) };
```

## 常见误区

❌ 缓存"永不过期"却又没有失效机制，导致数据长期陈旧。为每个条目设定绝对/滑动过期，或在写入时主动失效相关键。

❌ 手写"检查缓存→未命中→查库→写缓存"，高并发下同一时刻大量请求同时穿透到数据库（缓存击穿）。用 `HybridCache` 的内置防击穿，或自行加锁。

❌ 把巨大对象或整个列表塞进内存缓存，撑爆内存触发频繁 GC。缓存要有大小上限（`MemoryCacheOptions.SizeLimit`）并为条目声明 size。

## 适用版本

`IMemoryCache`/`IDistributedCache` 全版本通用；`HybridCache` 自 net9 起（可用于 net8 目标，通过对应包）。

## 参考资料

- [配置与 Options](configuration-options.md)
- [输出缓存（HTTP 响应缓存，区别于应用级缓存）](../aspnet-core/output-caching.md)
- [性能基准测试](../../performance/benchmarking.md)
- 官方文档：[ASP.NET Core 缓存概述](https://learn.microsoft.com/aspnet/core/performance/caching/overview)
- 官方文档：[HybridCache](https://learn.microsoft.com/aspnet/core/performance/caching/hybrid)
