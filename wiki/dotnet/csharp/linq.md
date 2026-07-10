---
title: LINQ（语言集成查询）
summary: 延迟执行的查询算子链，理解何时枚举、避免多次枚举与内存/数据库端执行的区别。
tags: [linq, ienumerable, iqueryable, 延迟执行, 查询]
introduced-in: general
applies-to: [all]
status: stable
source: https://learn.microsoft.com/dotnet/csharp/linq/
updated: 2026-07-10
---

> **要点速览**
> - LINQ 算子**延迟执行**，真正枚举发生在终结算子（`ToList`/`Count`/`First`/`foreach`）时。
> - `IEnumerable` 在内存执行；`IQueryable`（EF）翻译成 SQL 在数据库执行——位置天差地别。
> - 结果会多次用就先 `ToList` 物化一次，别反复枚举延迟查询。
> - 过滤/投影/分页尽量留在 `IQueryable` 下推数据库，别先 `ToList` 再筛。

## 概述

LINQ 让你用统一的声明式语法查询任何数据源——内存集合、数据库、XML。它的核心是一串可组合的算子（`Where`、`Select`、`OrderBy`、`GroupBy`…），返回的仍是可继续链式操作的序列。要真正用好 LINQ，必须理解两件事：**延迟执行**和 **`IEnumerable` 与 `IQueryable` 的区别**。

**延迟执行**指的是：像 `Where`/`Select` 这类算子只是"搭好查询"，并不立即跑；真正的枚举发生在你 `foreach`、或调用 `ToList`/`Count`/`First` 这类**终结算子**时。`IEnumerable<T>` 的查询在内存中用委托执行（LINQ to Objects）；`IQueryable<T>`（如 EF Core）则把查询表达式树翻译成 SQL 在数据库端执行——同样的代码，执行位置天差地别。

## 正确做法

链式组合算子，最后用一次终结算子物化结果；只取所需列、所需行：

```csharp
var topCustomers = orders
    .Where(o => o.Total > 100)          // 过滤
    .GroupBy(o => o.CustomerId)         // 分组
    .Select(g => new { Id = g.Key, Sum = g.Sum(o => o.Total) })
    .OrderByDescending(x => x.Sum)
    .Take(10)
    .ToList();                          // 终结：此刻才真正执行
```

对可能被多次使用的查询结果，**物化一次**（`ToList`）后复用，避免重复枚举重复计算：

```csharp
var active = users.Where(u => u.IsActive).ToList();  // 枚举一次
var count = active.Count;
var names = active.Select(u => u.Name);
```

## 常见误区

❌ 多次枚举同一个延迟查询：把 `var q = users.Where(...)` 反复 `q.Count()`、`q.Any()`、`foreach(q)`——每次都重新执行整条链（EF 场景是每次都打一次数据库）。需要多用就先 `ToList`。

❌ 在 `IQueryable`（EF Core）里调用数据库翻译不了的 C# 方法，触发客户端求值或抛异常。保持查询能翻译成 SQL，复杂逻辑先 `AsEnumerable()` 再做（并清楚代价）。

❌ 先 `ToList()` 把整表拉进内存再 `Where` 过滤——把数据库能干的活搬到了应用内存。过滤/投影/分页尽量留在 `IQueryable` 阶段下推到数据库。

## 适用版本

LINQ 全版本通用；net9 新增 `CountBy`/`AggregateBy`/`Index` 等算子简化常见聚合。

## 参考资料

- [集合选型](collections.md)
- [EF Core 查询性能](../ef-core/query-performance.md)
- 官方文档：[LINQ（语言集成查询）](https://learn.microsoft.com/dotnet/csharp/linq/)
- 官方文档：[标准查询运算符](https://learn.microsoft.com/dotnet/csharp/linq/standard-query-operators/)
