---
title: EF Core 查询性能
summary: 消灭 N+1、按需投影、只读查询关闭跟踪、大结果集用分页与拆分查询；看生成的 SQL；AOT 需预编译查询。
tags: [ef-core, performance, n+1, tracking, projection]
introduced-in: general
applies-to: [net8, net9, net10]
status: stable
source: https://learn.microsoft.com/dotnet/core/performance/efficient-querying
updated: 2026-07-11
---

# EF Core 查询性能

> **要点速览**
> - 每个 LINQ 查询 = 一次数据库往返；先看生成的 SQL（`ToQueryString()`/日志）。
> - 只读查询用 `AsNoTracking`；只取所需列（投影到 DTO）。
> - 循环访问导航会触发 **N+1**，用 `Include` 或投影一次取齐。
> - 多集合 `Include` 笛卡尔爆炸时用 `AsSplitQuery`；分页别一次拉全表。

## 概述

EF Core 的便利容易让人忘了每个 LINQ 查询背后都是一次真实数据库往返。绝大多数 EF 性能问题来自固定套路：**N+1 查询**（循环里逐条访问导航属性，触发 N 次额外查询）、**过度加载**（查了整个实体却只用两字段）、**无谓变更跟踪**（只读查询也建快照）、**一次拉回海量行**。配合下推过滤、按需投影、关闭跟踪即可解决大部分。

诊断第一步永远是**看生成的 SQL**——开启日志或用 `ToQueryString()` 把 LINQ 翻译出的 SQL 打出来，问题往往一眼可见。

## 问题 → 解法 决策表

| 现象 | 根因 | 解法 |
|------|------|------|
| 循环访问导航属性，数据库被打 N 次 | N+1 | `Include` 预加载，或投影一次取齐 |
| 只读列表内存占用高 | 不必要的变更跟踪 | `AsNoTracking` |
| 查整个实体只用两字段 | 过度加载 | 投影到 DTO（`Select`） |
| 整表拉进内存再 `Where` | 过滤没下推 | 留在 `IQueryable` 下推 |
| 多 `Include` 集合后行数暴涨 | 笛卡尔积 | `AsSplitQuery` |
| 分页一次拉全表 | 未分页 | `Skip`/`Take` 或 [分页扩展](pagination.md) |

## 正确做法

```csharp
var dtos = await db.Orders
    .AsNoTracking()                                   // 只读，不建跟踪快照
    .Where(o => o.Total > 100)                        // 过滤下推到数据库
    .Include(o => o.Customer)                          // 一次性预加载，避免 N+1
    .Select(o => new OrderDto(o.Id, o.Customer.Name))  // 只取所需列
    .Take(50)                                          // 分页，别一次拉全表
    .ToListAsync();

// 多集合 Include 笛卡尔爆炸 → 拆分查询
var blogs = await db.Blogs
    .Include(b => b.Posts).Include(b => b.Contributors)
    .AsSplitQuery()                                    // 拆成多条 SQL，避免行数相乘
    .ToListAsync();

// 看生成的 SQL
Console.WriteLine(db.Orders.Where(o => o.Total > 100).ToQueryString());
```

## 常见误区

❌ **N+1**：`foreach (var o in orders) use(o.Customer.Name);` 而没 `Include`，每次访问导航都打一次库。用 `Include` 或投影一次取齐。

❌ **只读列表也默认跟踪**，白白建快照占内存。查询即读展示用 `AsNoTracking`。

❌ **`db.Orders.ToList().Where(...)`**——先整表拉进内存再过滤。过滤/排序/分页留在 `IQueryable` 下推数据库。

❌ **用 `Include` 拉一大堆关联却只为显示计数**。需要聚合就用投影 `Select(x => new { x.Id, Count = x.Items.Count })`。

❌ **不看生成的 SQL 就调优**。先用 `ToQueryString()`/日志确认实际发了什么，再决定改哪。

## 适用版本

各版本通用；`AsSplitQuery` net5+；`ToQueryString()` net5+；net8+ **编译模型**（`dotnet ef dbcontext optimize`）优化冷启动；**预编译查询 net10 实验性**（见 [EF Core 10](../ef-core/ef-core-10.md#precompiled-queries)）。

### Native AOT 兼容性

`IQueryable` LINQ 与查询在 AOT 下可用，但**运行期建查询模型/表达式编译含反射**。AOT 发布需启用 **编译模型 + 预编译查询**（见 [EF AOT](ef-data-access.md) + [AOT 矩阵](../aot/aot-compatibility.md)）。`ToQueryString()` 在 AOT 下依赖已编译模型，仍可用；`AsNoTracking`/`AsSplitQuery` 无反射问题。

## 参考资料

- [关系建模](modeling-relationships.md) · [LINQ 延迟执行](../csharp/linq.md) · [分页](pagination.md) · [EF AOT](ef-data-access.md)
- [AOT 兼容性矩阵](../aot/aot-compatibility.md)
- 官方文档：[高效查询](https://learn.microsoft.com/dotnet/core/performance/efficient-querying) · [拆分查询](https://learn.microsoft.com/dotnet/core/querying/single-split-queries)
