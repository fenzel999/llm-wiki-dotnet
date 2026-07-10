---
title: EF Core 查询性能
summary: 消灭 N+1、按需投影、只读查询关闭跟踪、大结果集用分页与拆分查询。
tags: [ef-core, performance, n+1, tracking, projection, 查询]
introduced-in: general
applies-to: [net8, net9, net10]
status: stable
source: https://learn.microsoft.com/ef/core/performance/efficient-querying
updated: 2026-07-10
---

> **要点速览**
> - 每个 LINQ 查询 = 一次数据库往返；先看生成的 SQL（`ToQueryString()`/日志）。
> - 只读查询用 `AsNoTracking`；只取所需列（投影到 DTO）。
> - 循环访问导航会触发 **N+1**，用 `Include` 或投影一次取齐。
> - 多集合 `Include` 笛卡尔爆炸时用 `AsSplitQuery`；分页别一次拉全表。

## 概述

EF Core 的便利容易让人忘记每个 LINQ 查询背后都是一次真实的数据库往返。绝大多数 EF 性能问题都来自几个固定套路：**N+1 查询**（循环里逐条访问导航属性，触发 N 次额外查询）、**过度加载**（查了整个实体却只用两个字段）、**无谓的变更跟踪**（只读查询也建快照）、以及**一次拉回海量行**。理解这些，配合下推过滤、按需投影、关闭跟踪，就能解决大部分问题。

诊断的第一步永远是**看生成的 SQL**——开启日志或用 `ToQueryString()` 把 LINQ 翻译出的 SQL 打出来，很多问题一眼可见。

## 正确做法

只读查询用 `AsNoTracking`，只取需要的列（投影到 DTO），一次预加载关联避免 N+1：

```csharp
var dtos = await db.Orders
    .AsNoTracking()                                   // 只读，不建跟踪快照
    .Where(o => o.Total > 100)                        // 过滤下推到数据库
    .Include(o => o.Customer)                          // 一次性预加载，避免 N+1
    .Select(o => new OrderDto(o.Id, o.Customer.Name))  // 只取所需列
    .Take(50)                                          // 分页，别一次拉全表
    .ToListAsync();
```

一个查询里 `Include` 多个集合会产生笛卡尔爆炸时，用**拆分查询**：

```csharp
var blogs = await db.Blogs
    .Include(b => b.Posts).Include(b => b.Contributors)
    .AsSplitQuery()                                    // 拆成多条 SQL，避免行数相乘
    .ToListAsync();
```

## 常见误区

❌ N+1：`foreach (var o in orders) { use(o.Customer.Name); }` 而没 `Include`，每次访问导航都打一次库。用 `Include` 或投影一次取齐。

❌ 只读列表也默认跟踪，白白建快照占内存。查询即读展示用 `AsNoTracking`。

❌ `db.Orders.ToList().Where(...)`——先把整表拉进内存再过滤。过滤/排序/分页要留在 `IQueryable` 下推到数据库。

❌ 用 `Include` 拉一大堆关联却只为显示计数。需要聚合就用投影 `Select(x => new { x.Id, Count = x.Items.Count })`。

## 适用版本

各版本通用；`AsSplitQuery` net5+；`ToQueryString()` net5+；net8+ 编译模型/查询进一步优化冷启动。

## 参考资料

- [关系建模](modeling-relationships.md)
- [LINQ 延迟执行](../csharp/linq.md)
- 官方文档：[高效查询](https://learn.microsoft.com/ef/core/performance/efficient-querying)
- 官方文档：[拆分查询](https://learn.microsoft.com/ef/core/querying/single-split-queries)
