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

## 概述

在 EF Core 项目中，不应再引入仓储（Repository）模式或工作单元（Unit of Work）模式。`DbContext` 自身已经是一个工作单元（跟踪变更、一次性 `SaveChangesAsync` 提交），其 `DbSet<T>` 已经是一个仓储（聚合根的集合查询）。在它们之上再包一层只是重复抽象，徒增样板与间接性，反而模糊了领域边界。约定是：数据访问直接注入 `AppDbContext`，查询与写入都落在端点或应用服务里。

## 正确做法

直接注入 `DbContext` 使用（例如在最小 API 端点中，见 [最小 API 组织](../../patterns/composition.md#minimal-api-organization)）：

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

领域行为放在实体中，避免贫血模型：

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

- 使用场景：绝大多数 EF Core 场景——直接注入 `DbContext`，用 `DbSet<T>` 查询、用 `SaveChangesAsync` 提交。
- 需要跨聚合的一致性时，在同一个 `DbContext` 内一次性 `SaveChangesAsync`（工作单元语义天然具备）。

## 反例（常见错误）

- ❌ 在 `DbContext` 之上再写 `IOrderRepository` / `IUnitOfWork` 包装层。这是重复抽象，徒增间接性与样板。

```csharp
// ❌ 不必要：DbContext 已是工作单元 + 仓储
public interface IOrderRepository { Task<Order?> GetAsync(OrderId id); }
// ✅ 直接注入 AppDbContext 查询
```

- 把业务规则塞进数据访问层；领域行为应属于实体 / 领域服务。
- 误以为必须引入 Repository 才能做测试：多数情况用 EF Core 的 `InMemory` 提供者即可，无需额外抽象层。

## 适用版本

=== "net8 / net9 / net10"
    适用于所有受支持版本：`DbContext` 即工作单元 + 仓储，无需额外 Repository / Unit of Work 抽象。此约定为通用工程实践，与具体 .NET 版本无关。

## 参考资料

- 相关：[最小 API 组织](../../patterns/composition.md#minimal-api-organization)
- 相关：[依赖注入](../../concepts/dependency-injection.md)
- 相关：[释放与 using](../../patterns/disposable-using.md)
- 官方文档：[EF Core 文档](https://learn.microsoft.com/ef/core/)
