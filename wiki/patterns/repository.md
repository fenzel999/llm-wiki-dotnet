---
title: 仓储模式（Repository）
summary: 用仓储聚合数据访问逻辑，隔离领域与持久化，配合依赖注入与 EF Core。
tags: [pattern, data-access]
introduced-in: general
applies-to: [all]
status: stable
source: sources/README.md
updated: 2026-07-09
---

## 意图

将领域对象（domain）的存取逻辑集中到仓储（repository）中，让上层无需关心 EF Core / SQL 细节；通过接口注入实现解耦与可测试性，并避免把行为全部塞进实体的「贫血模型（anemic model）」。

## 正确做法

定义仓储接口，通过 [依赖注入](../concepts/dependency-injection.md) 注入：

```csharp
using Microsoft.EntityFrameworkCore;

namespace App.Domain;

public interface IOrderRepository
{
    Task<Order?> GetByIdAsync(OrderId id, CancellationToken ct = default);
    Task<IReadOnlyList<Order>> GetByCustomerAsync(string customerId, CancellationToken ct = default);
    Task AddAsync(Order order, CancellationToken ct = default);
}

public sealed class OrderRepository : IOrderRepository
{
    private readonly AppDbContext _db;
    public OrderRepository(AppDbContext db) => _db = db;

    public Task<Order?> GetByIdAsync(OrderId id, CancellationToken ct = default)
        => _db.Orders.Include(o => o.Items).FirstOrDefaultAsync(o => o.Id == id, ct);

    public Task<IReadOnlyList<Order>> GetByCustomerAsync(string customerId, CancellationToken ct = default)
        => _db.Orders.Where(o => o.CustomerId == customerId).ToListAsync(ct);

    public async Task AddAsync(Order order, CancellationToken ct = default)
    {
        _db.Orders.Add(order);
        await _db.SaveChangesAsync(ct);
    }
}
```

注册：

```csharp
builder.Services.AddScoped<IOrderRepository, OrderRepository>();
```

领域行为应放在实体或领域服务中，而非仓储里堆 CRUD，避免贫血：

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

- 使用：需要隔离持久化细节、便于替换/模拟数据来源、统一查询边界。
- 使用：搭配 [Result 类型](../patterns/result-type.md) 在仓储层返回找不到等可预期失败。
- 不用：简单 CRUD 且无需抽象时，可直接用 `DbContext`，避免无意义的转发层。
- 不用：不要把业务规则写进仓储，仓储只负责存取与聚合查询。

## 参考资料

- [依赖注入](../concepts/dependency-injection.md)
- [Result 类型](../patterns/result-type.md)
- [释放与 using](../patterns/disposable-using.md)
