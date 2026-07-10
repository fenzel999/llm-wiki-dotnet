---
title: EF Core 并发控制
summary: 用乐观并发（并发令牌 / rowversion）检测冲突更新，捕获 DbUpdateConcurrencyException 处理。
tags: [ef-core, concurrency, optimistic, rowversion, 并发]
introduced-in: general
applies-to: [net8, net9, net10]
status: stable
source: https://learn.microsoft.com/ef/core/saving/concurrency
updated: 2026-07-10
---

> **要点速览**
> - 默认**乐观并发**：不加锁，提交时检测记录是否被人改过。
> - 配并发令牌：`[Timestamp]`/rowversion 最省心，EF 自动加进 WHERE。
> - 冲突抛 `DbUpdateConcurrencyException`，捕获后**重新读取**再重试，别用旧值覆盖。
> - 乐观并发不排队加锁；需串行化才考虑事务隔离级别。

## 概述

两个用户同时读了同一条记录、各自修改再保存，后保存的会**悄悄覆盖**前者的改动——这就是"丢失更新"问题。EF Core 默认采用**乐观并发（optimistic concurrency）**：不加锁，而是在更新时检查"这条记录自我读取以来有没有被别人改过"，若改过就抛 `DbUpdateConcurrencyException`，交给你决定怎么办（重试、合并、还是告诉用户）。

实现方式是给实体配一个**并发令牌**：要么把某个字段标 `[ConcurrencyCheck]`，要么用数据库自增的 `rowversion`/`xmin` 列（最省心）。保存时 EF Core 会把令牌加进 `WHERE` 条件，若影响行数为 0 就说明被人改过。

## 正确做法

用 `rowversion` 并发令牌，保存时捕获冲突并处理：

```csharp
public class Product
{
    public int Id { get; set; }
    public int Stock { get; set; }
    [Timestamp] public byte[] RowVersion { get; set; } = default!;   // 数据库自动维护的并发令牌
}

try
{
    product.Stock--;
    await db.SaveChangesAsync();
}
catch (DbUpdateConcurrencyException ex)
{
    // 有人抢先改了：重新读取最新值、合并后重试，或提示用户
    var entry = ex.Entries.Single();
    var current = await entry.GetDatabaseValuesAsync();
    // ... 决定策略后重试
}
```

## 常见误区

❌ 完全不设并发令牌，多人同时改同一行时后者静默覆盖前者，数据丢失且无人察觉。对会并发修改的实体配并发令牌。

❌ 捕获 `DbUpdateConcurrencyException` 后直接无脑重试而不重新读取最新值——会用旧数据再次覆盖。重试前必须 reload。

❌ 误以为乐观并发会"加锁排队"。它不加锁，只在提交时检测冲突；真正需要串行化时才考虑数据库事务隔离级别。

## 适用版本

乐观并发各版本通用；`[Timestamp]`/rowversion 依数据库提供程序（SQL Server `rowversion`、PostgreSQL `xmin`）。

## 参考资料

- [迁移](migrations.md)
- [查询性能](query-performance.md)
- 官方文档：[EF Core 并发冲突处理](https://learn.microsoft.com/ef/core/saving/concurrency)
