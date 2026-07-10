---
title: 缓存（IMemoryCache / IDistributedCache / HybridCache）
summary: 本地内存、分布式与 net9 HybridCache 两级缓存；防击穿、过期策略、标签失效与 AOT 注意。
tags: [caching, memorycache, distributedcache, hybridcache]
introduced-in: general
applies-to: [net8, net9, net10]
status: stable
source: https://learn.microsoft.com/aspnet/core/performance/caching/overview
updated: 2026-07-10
---

# 缓存（IMemoryCache / IDistributedCache / HybridCache）

> **要点速览**
> - 三层：`IMemoryCache`（单进程最快）、`IDistributedCache`（跨实例共享）、`HybridCache`（L1+L2 两级 + **防击穿**）。
> - 新项目首选 **`HybridCache`**：`GetOrCreateAsync` 并发缺失只回源一次；`RemoveByTagAsync` 按标签批失效。
> - 每条缓存都要过期策略；别"永不过期"又不失效，也别用缓存存可变个性化响应却不分键。
> - 内存缓存要设大小上限；分布式缓存注意序列化与失效一致性。
> - **缓存是应用级优化，与 HTTP 响应缓存（`output-caching.md`）是两回事。**

## 概述

缓存是"用空间换时间"：把昂贵计算/慢查询的结果暂存，避免重复付出。.NET 提供三个层次：

| 类型 | 存哪 | 跨实例 | 何时用 |
|------|------|--------|--------|
| `IMemoryCache` | 进程内存 | ❌ | 单实例、可容忍重启丢失、读多写少 |
| `IDistributedCache` | Redis/SQL 等外部 | ✅ | 多实例需共享、允许网络开销 |
| `HybridCache`（net9+） | L1 内存 + L2 分布式 | ✅ | 既要快又要跨实例、还怕击穿（**首选**） |

`HybridCache` 把本地+分布式合成两级，并内置**防缓存击穿（stampede）**：同一 key 并发缺失时只让一个请求回源，其余等待复用。

## 正确做法

### 1. 首选 HybridCache：`GetOrCreateAsync` + 标签失效

```csharp
builder.Services.AddHybridCache();

public class ProductService(HybridCache cache, IProductRepo repo)
{
    public async Task<Product> GetAsync(int id, CancellationToken ct)
        => await cache.GetOrCreateAsync(
            $"product:{id}",
            token => repo.LoadAsync(id, token),   // 缺失才执行，且并发下只执行一次
            cancellationToken: ct);

    // 数据变更时按标签批量失效（net9+）
    public async Task UpdateAsync(Product p, CancellationToken ct)
    {
        await repo.SaveAsync(p, ct);
        await cache.RemoveByTagAsync("products", ct);   // 让所有 product:* 条目失效
    }
}
```

### 2. 纯本地：`IMemoryCache`

```csharp
builder.Services.AddMemoryCache(o => o.SizeLimit = 1024);   // 必须设大小上限

public class CachedLookup(IMemoryCache mem)
{
    public string Name(int id) => mem.GetOrCreate($"name:{id}", e =>
    {
        e.Size = 1;
        e.AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(5);   // 绝对过期
        return LoadName(id);
    })!;
}
```

### 3. 跨实例：`IDistributedCache`

```csharp
builder.Services.AddStackExchangeRedisCache(o => o.Configuration = "localhost:6379");
// 或用 SQL/本库其它实现；AddDistributedMemoryCache 仅测试用

public class Dist(IDCache dist)
{
    public async Task SetAsync(string k, string v, CancellationToken ct)
        => await dist.SetStringAsync(k, v,
            new DistributedCacheEntryOptions { SlidingExpiration = TimeSpan.FromMinutes(10) }, ct);

    public async Task<string?> GetAsync(string k, CancellationToken ct)
        => await dist.GetStringAsync(k, ct);
}
```

### 4. 过期策略怎么选

| 策略 | 含义 | 适用 |
|------|------|------|
| 绝对过期 | 到点必失效 | 数据有确定有效期（如每小时行情） |
| 滑动过期 | 每次访问续期，闲置超时失效 | 活跃会话类 |
| 标签失效 | 数据变更主动批量清 | 聚合缓存、列表缓存 |

## 常见误区

❌ **缓存"永不过期"且无失效机制**——数据长期陈旧。每条都设绝对/滑动过期，写入时主动失效相关键（`RemoveByTagAsync`）。

❌ **手写"查缓存→未命中→查库→写缓存"，高并发下击穿**——同一时刻大量请求同时穿透到库。用 `HybridCache` 内置防击穿，或自行加锁/合并回源。

❌ **把巨大对象/整表塞进内存缓存**——撑爆内存触发频繁 GC。设 `SizeLimit` 并为条目声明 `Size`。

❌ **缓存了随用户变化的个性化响应却不分键**——用户 A 看到用户 B 的内容。个性化内容谨慎缓存或按用户分键；HTTP 层响应缓存同理（见 [output-caching](../aspnet-core/output-caching.md)）。

❌ **把缓存当数据源**。缓存是加速层，不是持久层——回源失败/缓存清空时应用必须能从真源重建，不能假设缓存里一定有。

## 适用版本

`IMemoryCache`/`IDistributedCache` 全版本通用；**`HybridCache` 自 net9**（可通过对应包用于 net8 目标）。标签失效（`RemoveByTagAsync`）net9+。

### Native AOT 兼容性

缓存 API 本身**兼容 Native AOT**（[P16](../../governance/policy.md)、[AOT 矩阵](../aot/aot-compatibility.md)）：`HybridCache`/`IMemoryCache`/`IDistributedCache` 注册与使用均为 AOT 安全。注意两点：分布式缓存值需**序列化**，走 AOT 友好的 `System.Text.Json` 源生成（见 [序列化](../csharp/serialization.md)）；Redis 等客户端库是否支持 AOT 取决于该库本身，选 AOT 友好的实现。

## 参考资料

- [配置与 Options](configuration-options.md) · [输出缓存（HTTP 响应缓存）](../aspnet-core/output-caching.md)
- [性能基准测试](../../performance/benchmarking.md) · [AOT 兼容性矩阵](../aot/aot-compatibility.md)
- 官方文档：[ASP.NET Core 缓存概述](https://learn.microsoft.com/aspnet/core/performance/caching/overview) · [HybridCache](https://learn.microsoft.com/aspnet/core/performance/caching/hybrid)
