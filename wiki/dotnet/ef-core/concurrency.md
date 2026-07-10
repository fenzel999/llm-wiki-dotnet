---
title: EF Core 并发控制
summary: 乐观并发（并发令牌 / rowversion）检测冲突更新，捕获 DbUpdateConcurrencyException 后重新读取再处理；不加锁排队；AOT 友好。
tags: [ef-core, concurrency, optimistic, rowversion]
introduced-in: general
applies-to: [net8, net9, net10]
status: stable
source: https://learn.microsoft.com/dotnet/core/saving/concurrency
updated: 2026-07-11
---

# EF Core 并发控制

> **要点速览**
> - 默认**乐观并发**：不加锁，提交时检测记录是否被人改过。
> - 配并发令牌：`[Timestamp]`/rowversion 最省心，EF 自动加进 `WHERE`。
> - 冲突抛 `DbUpdateConcurrencyException`，捕获后**重新读取最新值**再决定重试/合并/提示，别用旧值覆盖。
> - 乐观并发不排队加锁；需串行化才考虑事务隔离级别。

## 概述

两个用户同时读同一条记录、各自改再保存，后保存者会**悄悄覆盖**前者——"丢失更新"问题。EF Core 默认**乐观并发（optimistic concurrency）**：不加锁，保存时检查"记录自我读取后是否被别人改过"，改过就抛 `DbUpdateConcurrencyException` 交给你处理。

实现：给实体配**并发令牌**——`[ConcurrencyCheck]` 标某字段，或用数据库自维护的 `rowversion`/`xmin`（最省心）。保存时 EF 把令牌加进 `WHERE`，影响行数 0 即说明被人改过。

## 乐观 vs 悲观 并发

| 方式 | 机制 | 适用 |
|------|------|------|
| 乐观（默认） | 提交时比对令牌，冲突抛异常 | 冲突少见、读多写少 |
| 悲观（显式锁/事务） | 读取即加锁，阻止他人改 | 冲突频繁、必须串行化 |

乐观并发不阻塞他人读取，吞吐高；代价是冲突要自己处理。

## 正确做法

```csharp
public class Product
{
    public int Id { get; set; }
    public int Stock { get; set; }
    [Timestamp] public byte[] RowVersion { get; set; } = default!;   // 并发令牌
}

try
{
    product.Stock--;
    await db.SaveChangesAsync();
}
catch (DbUpdateConcurrencyException ex)
{
    var entry = ex.Entries.Single();
    var current = await entry.GetDatabaseValuesAsync();   // 重新读取最新值
    // 合并策略：用 current 覆盖本地、或提示用户；之后再重试 SaveChanges
}
```

PostgreSQL 可用 `xmin`（系统列）作并发令牌，无需额外列。更新冲突可纳入[重试策略](../fundamentals/resilience.md)，但**每次重试前必须 reload 最新值**。

## 常见误区

❌ **不设并发令牌**，多人改同一行时后者静默覆盖，数据丢失无人察觉。对会并发修改的实体配令牌。

❌ **捕获异常后无脑重试而不重新读取**——用旧数据再次覆盖。重试前必须 `GetDatabaseValuesAsync` reload。

❌ **误以为乐观并发会"加锁排队"**。它不加锁，只在提交时检测冲突；真正需要串行化才考虑事务隔离级别。

❌ **把所有表都加 rowversion**。只有"会被并发修改"的实体需要；纯追加/只读表加了反而徒增开销。

## 适用版本

乐观并发各版本通用；`[Timestamp]`/rowversion 依提供程序（SQL Server `rowversion`、PostgreSQL `xmin`）。

### Native AOT 兼容性

并发令牌与 `SaveChanges` 冲突检测是模型/查询逻辑，**AOT 安全**（[AOT 矩阵](../aot/aot-compatibility.md)）。需启用 EF 编译模型（见 [EF AOT](ef-data-access.md)）；`DbUpdateConcurrencyException` 的 `Entries`/`GetDatabaseValuesAsync` 无运行期反射。

## 参考资料

- [迁移](migrations.md) · [查询性能](query-performance.md) · [EF AOT](ef-data-access.md)
- [弹性与容错（重试）](../fundamentals/resilience.md) · [AOT 兼容性矩阵](../aot/aot-compatibility.md)
- 官方文档：[EF Core 并发冲突处理](https://learn.microsoft.com/dotnet/core/saving/concurrency)
