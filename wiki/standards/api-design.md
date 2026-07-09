---
title: API 设计规范
summary: 参数校验守卫、最小可见性、不可变输入输出、一致返回类型、谨慎演进。
tags: [standard, api-design]
introduced-in: general
applies-to: [all]
status: stable
source: sources/README.md
updated: 2026-07-09
---

## 规则

- **参数校验守卫**：公共 API 入口立即校验参数，抛具体异常（见 [异常处理](../standards/exception-handling.md)）。
- **最小可见性**：默认 `private`/`internal`，仅暴露必要的 `public`，避免内部类型外泄。
- **不可变输入/输出**：方法接收与返回的类型尽量不可变（`record`/`readonly struct`/`IReadOnlyList`），避免调用方修改内部状态。
- **一致返回类型**：同类操作返回一致的类型与包装（如统一 `Results<T>`/`TypedResults` 或统一抛出），不要时而返回值、时而返回 `null`。
- **版本演进**：新增功能用新增方法/重载，保持向后兼容（见 [.NET 版本演进](../comparisons/net-evolution.md)），不要破坏已有签名。

## 正确做法

> 示例以应用服务（被最小 API 端点调用）为例；Web 层统一走最小 API，不使用 Controller。
> 数据访问直接注入 `DbContext`，不引入仓储/工作单元（见
> [EF Core 数据访问](../dotnet/ef-core/ef-data-access.md)）。

```csharp
public sealed class OrderService
{
    private readonly AppDbContext _db;

    public OrderService(AppDbContext db) => _db = db;

    public async Task<OrderView> GetAsync(OrderId id, CancellationToken ct)
    {
        ArgumentNullException.ThrowIfNull(id);

        var order = await _db.Orders.FirstOrDefaultAsync(o => o.Id == id, ct)
            ?? throw new OrderNotFoundException(id);

        return order.ToView(); // 返回不可变视图
    }
}

public readonly record struct OrderId(Guid Value);

public sealed record OrderView(Guid Id, IReadOnlyList<OrderLine> Lines);
```

## 反例

```csharp
// 错误1：缺少守卫，null 流入内部
public Order Get(OrderId id) => _db.Orders.Find(id); // id 为 null 时内部才崩

// 错误2：暴露可变内部集合
public List<OrderLine> Lines => _lines; // 调用方可改内部状态

// 错误3：返回类型不一致
public Order? GetA(int id);     // 有时返回 null
public Order GetB(int id);      // 有时抛异常
```

## 理由

守卫让错误在边界处快速暴露，避免无效状态扩散。最小可见性降低 API 表面积与耦合。不可变输入输出消除隐蔽的状态共享 bug。一致返回类型让调用方无需为每种方法编写不同处理逻辑，提升可预测性与可维护性。
