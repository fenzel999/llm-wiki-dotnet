---
title: EF Core 数据访问（不引入仓储/工作单元）
summary: EF Core 的 DbContext 本身就是仓储+工作单元，不要再加 Repository / Unit of Work 抽象。
tags: [pattern, data-access, ef-core]
introduced-in: general
applies-to: [all]
status: stable
source: https://learn.microsoft.com/ef/core/
updated: 2026-07-10
---

> **要点速览**
> - `DbContext` 本身已是仓储 + 工作单元，别再套 Repository/Unit of Work。
> - 直接用 `DbSet` + LINQ + `SaveChanges`，减少无意义抽象。
> - 需要抽象就抽在用例/查询层，而非包一层薄仓储。

## 概述

“要不要给 EF Core 再包一层 Repository / Unit of Work？”——这是 .NET 项目里被问得最多、也最容易被过度设计的问题之一。我的结论很明确：不要。原因在于，这层抽象是重复的。`DbContext` 本身就实现了一个工作单元（Unit of Work）：它跟踪实体的变更，并在你调用 `SaveChangesAsync` 时一次性、原子地提交；而它的每个 `DbSet<T>` 本身就是一个仓储（Repository）：它代表某个聚合根的集合，提供查询与新增。在它们之上再写 `IOrderRepository`、`IUnitOfWork`，等于把框架已经替你做的事又做了一遍，增加的只是样板代码、一层无意义的间接调用，以及——更隐蔽的代价——它会让领域边界变得模糊，让新人搞不清“真正的业务规则到底在哪”。

所以本库的约定是：数据访问直接注入 `AppDbContext`，查询和写入都落在最小 API 端点或应用服务（application service）里，不额外造抽象。

## 正确做法

注入 `DbContext` 的用法非常直白。下面是一个最小 API 端点里直接用它的例子（端点的整体组织方式可参考[最小 API 组织](../../patterns/composition.md#minimal-api-organization)）：

```csharp
using Microsoft.EntityFrameworkCore;

public sealed class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }
    public DbSet<Order> Orders => Set<Order>();
    public DbSet<Product> Products => Set<Product>();
}

// 端点/服务内
public async Task<Order?> GetOrderAsync(OrderId id, AppDbContext db, CancellationToken ct)
    => await db.Orders.Include(o => o.Items).FirstOrDefaultAsync(o => o.Id == id, ct);

public async Task AddOrderAsync(Order order, AppDbContext db, CancellationToken ct)
{
    db.Orders.Add(order);
    await db.SaveChangesAsync(ct);   // DbContext 即工作单元：一次原子提交
}
```

这个写法把“一次提交”的语义表达得很清楚：`SaveChangesAsync` 之前做的所有增删改，都会在调用时作为一个整体落库，要么全成、要么全不成。这正是工作单元要解决的问题，而你一行额外的协调代码都没写。

另一个容易被忽略、却很关键的点是：业务行为应该待在实体里，而不是数据访问层。如果你把订单加商品的逻辑写成 `repository.AddItem(order, product, qty)`，那 `Order` 就成了只有数据的“贫血模型”。更好的做法是把行为放进实体本身：

```csharp
public sealed class Order
{
    public OrderId Id { get; }
    private readonly List<OrderItem> _items = new();
    public IReadOnlyList<OrderItem> Items => _items;

    public void AddItem(Product product, int qty)
    {
        if (qty <= 0) throw new ArgumentOutOfRangeException(nameof(qty));
        _items.Add(new OrderItem(product, qty));
    }
}
```

需要跨多个聚合保持一致时，也在同一个 `DbContext` 内一次性 `SaveChangesAsync` 即可——工作单元语义天然具备，不需要你手动去“刷盘”或“提交事务”。对绝大多数 EF Core 场景，这套“直接注入 DbContext + 用 DbSet 查询 + 用 SaveChangesAsync 提交”就足够了。

## 常见误区

最常见的错误，就是在 `DbContext` 之上再包一层 Repository / Unit of Work：

```csharp
// ❌ 不必要：DbContext 已是工作单元 + 仓储
public interface IOrderRepository { Task<Order?> GetAsync(OrderId id); }
// ✅ 直接注入 AppDbContext 查询
```

这层接口除了把 `db.Orders.FirstOrDefaultAsync(...)` 换个名字包起来，没有提供任何额外价值，反而让你多维护一套类型、多想一层依赖关系。另一个误区是把业务规则塞进数据访问层——领域行为属于实体或领域服务，不该和“怎么读数据库”混在一起。还有人担心“不写 Repository 就没法测试”，其实大多数情况下用 EF Core 的 `InMemory` 提供程序就足以跑单元测试，根本不需要为可测性额外造抽象层。

## 适用版本

=== "net8 / net9 / net10"
    适用于所有受支持版本：`DbContext` 即工作单元 + 仓储，无需额外 Repository / Unit of Work 抽象。此约定为通用工程实践，与具体 .NET 版本无关。

## 参考资料

- 相关：[最小 API 组织](../../patterns/composition.md#minimal-api-organization)
- 相关：[依赖注入](../fundamentals/dependency-injection.md)
- 相关：[释放与 using](../../patterns/disposable-using.md)
- 相关：[并发控制](concurrency.md) · [分页查询与动态排序](pagination.md) · [EF Core vs ADO.NET](../../comparisons/ef-vs-ado.md)
- 官方文档：[EF Core 文档](https://learn.microsoft.com/ef/core/)
