---
title: API 设计规范
summary: 参数校验守卫、最小可见性、不可变输入输出、一致返回类型、谨慎演进。
tags: [standard, api-design]
introduced-in: general
applies-to: [all]
status: stable
source: https://learn.microsoft.com/dotnet/standard/design-guidelines/
updated: 2026-07-10
---

## 概述

API 设计规范定义了对公共接口的一组基本约束，目标是让库与应用服务在边界处稳健、可预测且易于演进。遵守这些规则能让错误在入口快速暴露、降低耦合面，并使调用方无需为每种方法编写差异化的处理逻辑。当接口既能防御无效输入、又对输出做出明确承诺时，整个系统的可维护性与稳定性都会随之提升。

## 正确做法

公共 API 的第一道防线是参数校验守卫：在方法入口立即校验入参，遇到非法值抛出具体异常，避免无效状态流入内部逻辑。可见性应贯彻最小原则，类型默认设为 `private` 或 `internal`，只暴露真正需要对外契约的部分，防止内部实现细节外泄。方法的输入与输出类型应尽量不可变（如 `record`、只读结构或 `IReadOnlyList`），以此杜绝调用方悄然修改内部状态。同类操作要保持一致的返回语义，要么统一返回值、要么统一定义失败路径，不要时而返回结果时而返回 `null`。版本演进时优先用新增方法或重载来扩展能力，保持已有签名向后兼容，避免在升级时破坏既有调用方。

下面的示例以应用服务（被最小 API 端点调用）为例；Web 层统一走最小 API，不使用 Controller。数据访问直接注入 `DbContext`，不引入仓储/工作单元。可以看到 `GetAsync` 在入口用 `ArgumentNullException.ThrowIfNull` 守卫，未找到时抛出具体异常，并返回一个不可变的 `OrderView`，整个输入输出都不暴露可变状态。

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

## 反例（常见错误）

❌ 以下写法展示了三类典型错误：缺少守卫让 `null` 流入内部、对外暴露可变集合、以及返回类型前后不一致。

```csharp
// 错误1：缺少守卫，null 流入内部
public Order Get(OrderId id) => _db.Orders.Find(id); // id 为 null 时内部才崩

// 错误2：暴露可变内部集合
public List<OrderLine> Lines => _lines; // 调用方可改内部状态

// 错误3：返回类型不一致
public Order? GetA(int id);     // 有时返回 null
public Order GetB(int id);      // 有时抛异常
```

其他常见错误：

- 把内部类型（`internal` 实现类）直接公开为 `public` 返回类型，导致后续无法自由重构。
- 在公共方法上省略参数校验，把 `null` 检查推给调用方，最终在更深层级才崩溃。
- 为扩展能力而直接修改既有方法签名，破坏已有调用方的编译与运行。

## 适用版本

这些规范通用，本节省略（不写任何版本选项卡）。

## 参考资料

- 相关：[异常处理](../standards/exception-handling.md)
- 相关：[.NET 版本演进](../comparisons/net-evolution.md)
- 官方文档：[Framework Design Guidelines](https://learn.microsoft.com/dotnet/standard/design-guidelines/)
