---
title: EF Core 复杂类型与 JSON 列
summary: 将值对象映射为 complex type 或 JSON 列，无独立主键，随宿主实体存取。
tags: [efcore, complex-types, json, value-object, net10]
introduced-in: general
applies-to: [net8, net9, net10]
status: stable
source: sources/README.md
updated: 2026-07-09
---

## 概述

EF Core 的复杂类型（complex types）用于映射没有独立标识（无主键）的值对象（value object，如地址、货币），它们作为宿主实体的一部分持久化。可将其展开为宿主表的列，或整体序列化为一列 JSON。这比 owned entity（拥有实体）更贴合领域驱动设计中的值语义。

## 正确做法

声明值对象并配置为复杂类型：

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
         .ComplexProperty(c => c.ShippingAddress);
    }
}
```

映射为 JSON 列：

```csharp
b.Entity<Customer>()
 .ComplexProperty(c => c.ShippingAddress, cp => cp.ToJson());
```

## 常见错误

- 给值对象加主键或让多个实体共享同一实例：复杂类型无标识，不能共享引用。
- 期望对复杂类型做独立查询（`DbSet`）：它只能随宿主实体访问。
- 使用可变类而非不可变 `record`，导致变更跟踪困惑。

## 适用版本

=== "net10"
    复杂类型支持集合与更完善的 JSON 列映射。

=== "net8"
    引入复杂类型，功能范围较小。

## 参考资料

- [源汇总 sources/README.md](../../sources/README.md)
- 相关：[命名查询筛选器](named-query-filters.md)
- 官方文档：[What's new in EF Core 10](https://learn.microsoft.com/ef/core/what-is-new/ef-core-10.0/whatsnew)

