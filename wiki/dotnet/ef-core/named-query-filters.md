---
title: EF Core 命名查询筛选器
summary: .NET 10 支持为实体定义多个命名的全局查询筛选器，并可按名选择性禁用。
tags: [efcore, query-filter, soft-delete, multitenancy, net10]
introduced-in: net10
applies-to: [net10]
status: stable
source: sources/README.md
updated: 2026-07-09
---

## 概述

EF Core 的全局查询筛选器（global query filter）会自动追加到该实体的所有查询，常用于软删除（soft delete）与多租户（multitenancy）。以往每个实体只能有一个筛选器；.NET 10 支持命名查询筛选器（named query filters），可为同一实体定义多个具名筛选器，并按名单独禁用。

## 正确做法

定义多个命名筛选器：

```csharp
protected override void OnModelCreating(ModelBuilder b)
{
    b.Entity<Post>()
     .HasQueryFilter("SoftDelete", p => !p.IsDeleted)
     .HasQueryFilter("Tenant", p => p.TenantId == _tenantId);
}
```

查询时按名禁用其中一个（例如管理后台需要看软删除数据）：

```csharp
var all = await db.Posts
    .IgnoreQueryFilters(new[] { "SoftDelete" })
    .ToListAsync();
```

## 常见错误

- 沿用旧的单一 `IgnoreQueryFilters()` 期望只关掉一个：不带名参数会禁用全部筛选器。
- 命名重复：同名筛选器会互相覆盖。
- 在筛选器中引用非确定性或会变化的捕获变量，导致缓存的查询计划使用过期值。

## 适用版本

=== "net10"
    支持命名查询筛选器与按名禁用。

=== "net8"
    每个实体仅一个匿名筛选器，`IgnoreQueryFilters()` 全禁用。

## 参考资料

- [源汇总 sources/README.md](../../sources/README.md)
- 相关：[复杂类型与 JSON 列](complex-types-json.md)
- 官方文档：[What's new in EF Core 10](https://learn.microsoft.com/ef/core/what-is-new/ef-core-10.0/whatsnew)

