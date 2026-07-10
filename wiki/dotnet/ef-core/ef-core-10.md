---
title: EF Core 10 数据特性
summary: .NET 10 / EF Core 10 的关键数据特性——复杂类型与 JSON 列映射、命名查询筛选器。
tags: [ef-core, complex-types, query-filter, net10]
introduced-in: net10
applies-to: [net10]
status: stable
source: https://learn.microsoft.com/ef/core/what-is-new/ef-core-10.0/whatsnew
updated: 2026-07-10
---

> **要点速览**
> - EF Core 10：复杂类型与 JSON 列映射、命名查询筛选器。
> - 复杂类型（无标识的值对象）可直接映射，不必拆独立表。
> - 命名查询筛选器支持一个实体多个可命名的全局筛选器。

## 概述

EF Core 10 在“怎么存值对象”和“怎么统一过滤查询”这两件事上给了新能力。为什么这两件事值得单独讲？因为它们分别对应着日常里两个反复出现的痛点：一是领域驱动设计里那些没有主键、却要跟着实体一起落库的值对象（value object，比如地址、货币、坐标），以前要么硬塞进 owned entity，要么自己手写映射；二是软删除、多租户这类“每个查询都要自动带上条件”的需求，以前一个实体只能挂一个全局筛选器，想临时关掉其中一个都不行。

这一页就讲这两个特性：复杂类型（complex types）如何把值对象干净地映射成列或一整列 JSON，以及命名查询筛选器（named query filters）如何让你为同一实体定义多个具名筛选器、并能按名单独关掉。数据访问的整体约定——也就是不引入 Repository / Unit of Work——不在本页，单独看[EF Core 数据访问](ef-data-access.md)。

## 复杂类型与 JSON 列 {#complex-types-json}

先说复杂类型。所谓复杂类型，就是“没有独立标识的值对象”。它没有主键，也不该被当成一张独立的表，它是某个宿主实体的一部分。一个典型的例子是 `Address`：客户有送货地址，订单也有账单地址，但它们只是“一串相关的字段”，而不是需要被单独查询、单独引用的东西。EF Core 把这类值对象映射成复杂类型后，你可以选择把它展开成宿主表的几列（City、Street、Zip 各占一列），也可以整体序列化成宿主表里的一列 JSON。

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

相比 owned entity，复杂类型更贴合“值”的语义——两个值相等就意味着它们等价，而不是“指向同一个东西”。用的时候有几个坑要避开：复杂类型没有标识，所以别给它加主键，也别让多个实体共享同一个值对象实例（共享引用会破坏值语义）；它不能有自己的 `DbSet<T>`，你只能跟着宿主实体一起访问它；从变更跟踪的角度，用不可变的 `record` 比可变类更省心，否则容易搞不清楚到底改了没。

## 命名查询筛选器 {#named-query-filters}

再说查询筛选器。全局查询筛选器（global query filter）大家应该不陌生：给它配一个表达式，EF Core 就会自动把这个条件追加到该实体的所有查询后面，最常见的用途就是软删除（`IsDeleted == false`）和多租户（`TenantId == 当前租户`）。但有件事一直很别扭——一个实体只能挂**一个**匿名筛选器。想象一个场景：你的 `Post` 同时有软删除和多租户两个过滤条件，可管理后台有时候要“看被删掉的数据”，有时候要“跨租户查看”，你却只能要么全开、要么用 `IgnoreQueryFilters()` 一刀切全关，没法只关其中一个。

.NET 10 的命名查询筛选器解决了这个粒度问题：你可以给同一个实体定义多个具名筛选器，每个都有名字，关的时候按名字关。

```csharp
protected override void OnModelCreating(ModelBuilder b)
{
    b.Entity<Post>()
     .HasQueryFilter("SoftDelete", p => !p.IsDeleted)
     .HasQueryFilter("Tenant", p => p.TenantId == _tenantId);
}
```

查询时只关掉软删除那一个，比如管理后台要恢复数据：

```csharp
var all = await db.Posts
    .IgnoreQueryFilters(new[] { "SoftDelete" })
    .ToListAsync();
```

这里有个务必记住的差异：老的、不带参数的 `IgnoreQueryFilters()` 依旧存在，但它会**关掉全部**筛选器；如果你只想关一个，必须传名字数组，像上面那样。另外，起名别重复，同名筛选器会互相覆盖；筛选器里如果捕获了会变化的外部变量，要当心 EF Core 可能缓存查询计划、用到过期的值，所以筛选器里的条件尽量用确定的、稳定的表达式。

## 适用版本

=== "net10"
    复杂类型支持集合与更完善的 JSON 列映射；支持命名查询筛选器与按名禁用。

=== "net8"
    引入复杂类型但功能范围较小；每个实体仅一个匿名筛选器，`IgnoreQueryFilters()` 全禁用。

## 参考资料

- 相关：[EF Core 数据访问](ef-data-access.md)
- 官方文档：[What's new in EF Core 10](https://learn.microsoft.com/ef/core/what-is-new/ef-core-10.0/whatsnew)
