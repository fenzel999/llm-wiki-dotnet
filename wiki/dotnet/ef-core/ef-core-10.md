---
title: EF Core 10 数据特性
summary: .NET 10 / EF Core 10 的关键数据特性——复杂类型与 JSON 列映射、命名查询筛选器。
tags: [efcore, complex-types, query-filter, net10]
introduced-in: net10
applies-to: [net10]
status: stable
source: https://learn.microsoft.com/ef/core/what-is-new/ef-core-10.0/whatsnew
updated: 2026-07-10
---

## 概述

EF Core 10 在值对象映射与全局查询筛选上做了增强。本页汇总两个最常用的新特性：复杂类型（complex types）完善了对无标识值对象的映射，可展开为列或序列化为 JSON 列；命名查询筛选器（named query filters）允许为同一实体定义多个具名全局筛选器并按名单独禁用。数据访问的整体约定（不引入 Repository / Unit of Work）见 [EF Core 数据访问](ef-data-access.md)。

## 正确做法

### 复杂类型与 JSON 列 {#complex-types-json}

复杂类型（complex types）用于映射没有独立标识（无主键）的值对象（value object，如地址、货币），它们作为宿主实体的一部分持久化。可将其展开为宿主表的列，或整体序列化为一列 JSON，比 owned entity 更贴合领域驱动设计中的值语义。

```csharp
public record Address(string City, string Street, string Zip);

public class Customer
{
    public int Id { get; set; }
    public Address ShippingAddress { get; set; } = default!;
}

public class AppDbContext : DbContext
{
    public DbSet<Customer> Customers => Set<Customer>();

    protected override void OnModelCreating(ModelBuilder b)
    {
        b.Entity<Customer>()
         .ComplexProperty(c => c.ShippingAddress);          // 展开为列
        // 或整体序列化为 JSON 列：
        // b.Entity<Customer>()
        //  .ComplexProperty(c => c.ShippingAddress, cp => cp.ToJson());
    }
}
```

**常见错误**

- 给值对象加主键或让多个实体共享同一实例：复杂类型无标识，不能共享引用。
- 期望对复杂类型做独立查询（`DbSet`）：它只能随宿主实体访问。
- 使用可变类而非不可变 `record`，导致变更跟踪困惑。

### 命名查询筛选器 {#named-query-filters}

全局查询筛选器（global query filter）会自动追加到该实体的所有查询，常用于软删除（soft delete）与多租户（multitenancy）。以往每个实体只能有一个筛选器；.NET 10 支持命名查询筛选器（named query filters），可为同一实体定义多个具名筛选器，并按名单独禁用。

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

**常见错误**

- 沿用旧的单一 `IgnoreQueryFilters()` 期望只关掉一个：不带名参数会禁用全部筛选器。
- 命名重复：同名筛选器会互相覆盖。
- 在筛选器中引用非确定性或会变化的捕获变量，导致缓存的查询计划使用过期值。

## 适用版本

=== "net10"
    复杂类型支持集合与更完善的 JSON 列映射；支持命名查询筛选器与按名禁用。

=== "net8"
    引入复杂类型但功能范围较小；每个实体仅一个匿名筛选器，`IgnoreQueryFilters()` 全禁用。

## 参考资料

- 相关：[EF Core 数据访问](ef-data-access.md)
- 官方文档：[What's new in EF Core 10](https://learn.microsoft.com/ef/core/what-is-new/ef-core-10.0/whatsnew)
