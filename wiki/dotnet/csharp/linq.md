---
title: LINQ（语言集成查询）
summary: 延迟执行的查询算子链；分清 IEnumerable（内存）与 IQueryable（翻译成 SQL）；避免多次枚举与误把过滤拉进内存；AOT 友好。
tags: [linq, ienumerable, iqueryable]
introduced-in: general
applies-to: [net8, net9, net10]
status: stable
source: https://learn.microsoft.com/dotnet/csharp/linq/
updated: 2026-07-11
---

# LINQ（语言集成查询）

> **要点速览**
> - LINQ 算子**延迟执行**：真正枚举发生在终结算子（`ToList`/`Count`/`First`/`foreach`）时。
> - `IEnumerable` 在内存用委托执行；`IQueryable`（EF）翻译成 SQL 在数据库执行——位置天差地别。
> - 结果会多次用就先 `ToList` 物化一次，别反复枚举延迟查询。
> - 过滤/投影/分页尽量留在 `IQueryable` 下推数据库，别先 `ToList` 再筛。

## 概述

LINQ 用统一声明式语法查询任意数据源（内存、数据库、XML）。核心是一串可组合算子（`Where`/`Select`/`OrderBy`/`GroupBy`…），返回仍可链式操作。用好它必须懂：**延迟执行** 与 **`IEnumerable` vs `IQueryable`**。

**延迟执行**：`Where`/`Select` 只"搭查询"，不立即跑；真正枚举在终结算子时。

| 序列类型 | 执行位置 | 机制 |
|----------|----------|------|
| `IEnumerable<T>` | 内存（LINQ to Objects） | 委托逐个元素执行 |
| `IQueryable<T>`（EF Core） | 数据库 | 表达式树翻译成 SQL |

同样的代码，执行位置天差地别——这决定了"能不能下推数据库"。

## 正确做法

### 1. 链式组合 + 一次终结

```csharp
var topCustomers = orders
    .Where(o => o.Total > 100)
    .GroupBy(o => o.CustomerId)
    .Select(g => new { Id = g.Key, Sum = g.Sum(o => o.Total) })
    .OrderByDescending(x => x.Sum)
    .Take(10)
    .ToList();                          // 终结：此刻才执行
```

### 2. 何时物化？决策表

| 情况 | 做 | 理由 |
|------|----|------|
| 结果要多次用（Count/遍历/投影） | 先 `ToList()` 物化一次 | 避免重复枚举/重复打库 |
| 只要一个值 | `First`/`Count`/`Any` | 不物化整个序列 |
| 过滤/分页/聚合（EF） | 留在 `IQueryable` 不下推 | 让数据库干 |
| 需要 C# 才能算的逻辑（EF 翻译不了） | `AsEnumerable()` 后再算 | 明确"拉到内存算"的代价 |

```csharp
var active = users.Where(u => u.IsActive).ToList();  // 枚举一次
var count = active.Count;
var names = active.Select(u => u.Name);
```

## 常见误区

❌ **多次枚举同一延迟查询**：`q = users.Where(...)` 后反复 `q.Count()`/`q.Any()`/`foreach(q)`——每次重跑整条链（EF 场景每次打一次库）。多用就先 `ToList`。

❌ **在 `IQueryable`（EF）里调用数据库翻译不了的 C# 方法**，触发客户端求值或抛异常。保持查询能翻译成 SQL；复杂逻辑先 `AsEnumerable()` 再做（并清楚代价）。

❌ **先 `ToList()` 把整表拉进内存再 `Where`**——把数据库能干的活搬进应用内存。过滤/投影/分页留在 `IQueryable` 下推。

❌ **误以为 LINQ 一定快**。延迟执行只是"不立即算"，真正枚举仍有成本；大数据用数据库端聚合优于内存 `GroupBy`。

## 适用版本

LINQ 全版本通用；net9 新增 `CountBy`/`AggregateBy`/`Index` 等算子简化常见聚合。

### Native AOT 兼容性

- **`IEnumerable` LINQ**：纯委托 + 迭代器，**AOT 安全**（[AOT 矩阵](../aot/aot-compatibility.md)）。
- **`IQueryable`（EF Core）**：需启用编译模型/预编译查询，否则运行期建模型有反射（见 [EF AOT](../ef-core/ef-data-access.md)）。表达式树由 EF 编译为 SQL，无 `System.Reflection.Emit` 生成运行期代码。

## 参考资料

- [集合选型](collections.md) · [EF Core 查询性能](../ef-core/query-performance.md)
- [AOT 兼容性矩阵](../aot/aot-compatibility.md) · [EF Core 数据访问](../ef-core/ef-data-access.md)
- 官方文档：[LINQ（语言集成查询）](https://learn.microsoft.com/dotnet/csharp/linq/) · [标准查询运算符](https://learn.microsoft.com/dotnet/csharp/linq/standard-query-operators/)
