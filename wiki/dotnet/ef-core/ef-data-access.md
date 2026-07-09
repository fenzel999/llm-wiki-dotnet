---
title: EF Core 数据访问（不引入仓储/工作单元）
summary: EF Core 的 DbContext 本身就是仓储+工作单元，不要再加 Repository / Unit of Work 抽象。
tags: [pattern, data-access, ef-core]
introduced-in: general
applies-to: [all]
status: stable
source: https://learn.microsoft.com/ef/core/
updated: 2026-07-09
---

## 意图

**在 EF Core 项目中不使用仓储（Repository）模式，也不使用工作单元（Unit of Work）模式。**
`DbContext` 自身已经是一个工作单元（跟踪变更、一次性 `SaveChangesAsync` 提交），其 `DbSet<T>`
已经是一个仓储（聚合根的集合查询）。再包一层只是重复抽象，徒增样板与间接性。

> 约定：数据访问直接注入 `AppDbContext`，查询/写入都落在端点或应用服务里。

## 正确做法

直接注入 `DbContext` 使用（例如在最小 API 端点中，见
[最小 API 组织](../../patterns/minimal-api-organization.md)）：

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

## 何时使用 / 何时不用

- 使用：绝大多数 EF Core 场景——直接注入 `DbContext`，用 `DbSet<T>` 查询、用 `SaveChangesAsync` 提交。
- 使用：需要跨聚合的一致性时，在同一个 `DbContext` 内一次性 `SaveChangesAsync`（工作单元语义天然具备）。
- **不用：不要在 `DbContext` 之上再写 `IOrderRepository` / `IUnitOfWork` 包装层。** 这是重复抽象。
- 不用：不要把业务规则塞进数据访问层；领域行为属于实体/领域服务。

## 例外（极少数）

- 需要彻底脱离 EF Core 的可测试性且不便用 `InMemory` 提供者时，可对**特定**用例抽象一个小接口；
  但这是例外，不是默认做法。

## 参考资料

- [最小 API 组织](../../patterns/minimal-api-organization.md)
- [依赖注入](../../concepts/dependency-injection.md)
- [释放与 using](../../patterns/disposable-using.md)
