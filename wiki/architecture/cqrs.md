---
title: CQRS（命令查询职责分离）
summary: 把"写"（命令）和"读"（查询）拆成两条独立路径，各自优化；不必引入中介库即可实现。
tags: [architecture, cqrs, command, query, 读写分离]
introduced-in: general
applies-to: [all]
status: stable
source: https://learn.microsoft.com/dotnet/architecture/microservices/microservice-ddd-cqrs-patterns/apply-simplified-microservice-cqrs-ddd-patterns
updated: 2026-07-10
---

> **要点速览**
> - 把写（命令，走领域模型）和读（查询，直接投影 DTO）拆成两条路径。
> - 默认用**轻量版**（同库、分处理器）；读写分库+事件同步的重量版仅在负载严重不对称时才用。
> - 不用 MediatR：处理器就是普通类，DI 注入直接调用。
> - 查询路径别硬套完整领域实体 + 跟踪，直接 `AsNoTracking` + 投影。

## 概述

CQRS（Command Query Responsibility Segregation）的核心主张只有一句：**把"改状态的操作"（命令 Command）和"读数据的操作"（查询 Query）分成两条独立的路径**。写路径关心业务规则、一致性、领域模型；读路径关心展示效率，往往可以绕开领域模型直接投影成 DTO。二者需求本就不同，硬用同一套模型会互相拖累。

CQRS 有轻重两档。**轻量版**（最常用）：同一个数据库，但代码里命令和查询走不同的处理器与模型——命令用领域实体，查询直接 `IQueryable`→DTO。**重量版**：读写用不同的存储甚至不同的数据库，靠事件同步——复杂度高，只有在读写负载严重不对称时才值得。多数应用用轻量版就够。

## 正确做法

命令与查询分成两类处理器；**不需要第三方中介库**（[P10](../governance/policy.md)），直接注入调用即可：

```csharp
// 命令：走领域模型，保证业务规则
public class CreateOrderHandler(AppDbContext db)
{
    public async Task<int> Handle(CreateOrder cmd)
    {
        var order = Order.Create(cmd.Sku, cmd.Qty);   // 领域逻辑
        db.Orders.Add(order);
        await db.SaveChangesAsync();
        return order.Id;
    }
}

// 查询：绕开领域模型，直接投影为 DTO，读得快
public class GetOrderHandler(AppDbContext db)
{
    public Task<OrderDto?> Handle(int id) => db.Orders
        .AsNoTracking()
        .Where(o => o.Id == id)
        .Select(o => new OrderDto(o.Id, o.Total))
        .FirstOrDefaultAsync();
}
```

## 常见误区

❌ 一上来就用"读写分库 + 事件同步"的重量级 CQRS，给简单应用背上最终一致性与运维复杂度。默认用轻量版（同库、分处理器）。

❌ 为 CQRS 引入 MediatR 之类第三方中介库。按 P10 不用；命令/查询处理器就是普通类，直接 DI 注入调用，或手写一个几十行的分发器。

❌ 查询路径还硬套完整领域实体 + 变更跟踪，读操作被写模型拖慢。查询直接投影 DTO + `AsNoTracking`。

## 适用版本

模式与版本无关，全版本适用。

## 参考资料

- [垂直切片](vertical-slice.md)
- [领域驱动设计](ddd.md)
- [EF Core 查询性能](../dotnet/ef-core/query-performance.md)
- 官方文档：[简化的 CQRS 与 DDD 模式](https://learn.microsoft.com/dotnet/architecture/microservices/microservice-ddd-cqrs-patterns/apply-simplified-microservice-cqrs-ddd-patterns)
