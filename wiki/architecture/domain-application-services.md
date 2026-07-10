---
title: 领域服务与应用服务（+ DTO 手写映射）
summary: 区分领域服务（跨聚合业务）与应用服务（用例编排、DTO 边界、事务边界）；手写映射不用 AutoMapper。
tags: [architecture, ddd, application-service, domain-service, dto]
introduced-in: general
applies-to: [all]
status: stable
source: https://learn.microsoft.com/dotnet/architecture/microservices/microservice-ddd-cqrs-patterns/ddd-oriented-microservice
updated: 2026-07-10
---

# 领域服务与应用服务

> **要点速览**
> - **领域服务**：放不进单个实体的跨聚合业务逻辑，无状态、属领域层。
> - **应用服务**：编排用例、接收/返回 **DTO**、是**事务边界**（一次 `SaveChanges` = 一个 UoW）。
> - 应用服务**不写核心业务逻辑**，只协调领域对象；核心规则在领域层。
> - DTO 边界**手写映射**（几行投影），不用 AutoMapper（第三方且已商用）；不额外造仓储/UoW 抽象。

## 概述

DDD 分层里有两类"服务"，职责必须分清：**领域服务（Domain Service）**承载"跨多个聚合、放不进任何单个实体"的纯业务逻辑（如"跨账户转账"），无状态，属于领域层；**应用服务（Application Service）**是用例的编排者——接收 DTO、调用领域对象与领域服务、持久化，然后返回 DTO。应用服务是**事务边界**：一个用例方法内的所有更改一起提交或回滚，而这个"工作单元（UoW）"在 EF Core 里就是**一次 `SaveChanges`**，无需再造 UoW 抽象（沿用 [EF 数据访问](../dotnet/ef-core/ef-data-access.md)）。

本库的两条取舍：**不用控制器**——用 [Minimal API](../dotnet/aspnet-core/aspnet-core-10.md) 端点直接调用应用服务；**不用 AutoMapper**——DTO 与实体之间**手写映射**，几行投影既清晰又零依赖（[P10](../governance/policy.md)）。

## 正确做法

领域逻辑在领域对象/领域服务；应用服务编排 + DTO 边界 + 手写映射；Minimal API 暴露：

```csharp
// 应用服务：编排用例，DTO 进 DTO 出，事务边界
public class OrderAppService(AppDbContext db, PricingService pricing)   // PricingService 是领域服务
{
    public async Task<OrderDto> PlaceAsync(CreateOrderDto input)
    {
        var order = Order.Create(input.Sku, input.Qty);   // 业务规则在领域对象里
        order.SetPrice(pricing.Quote(order));              // 跨聚合逻辑在领域服务
        db.Orders.Add(order);
        await db.SaveChangesAsync();                       // 一次提交 = 一个工作单元
        return Map(order);                                 // 手写映射，不用 AutoMapper
    }

    private static OrderDto Map(Order o) => new(o.Id, o.Sku, o.Qty, o.Total);
}

app.MapPost("/orders", async (CreateOrderDto dto, OrderAppService svc) => Results.Ok(await svc.PlaceAsync(dto)));
```

## 常见误区

❌ 把核心业务规则写进应用服务（甚至写进端点/控制器），领域层沦为贫血数据袋。规则归领域对象/领域服务，应用服务只编排。

❌ 直接把 EF 实体序列化返回给客户端，泄漏内部结构、产生循环引用与过度暴露。用 DTO 作边界。

❌ 引入 AutoMapper 做映射。它是第三方且已商用（P10 不用）；手写 `Map` / LINQ 投影更透明、可调试、零依赖。

❌ 在应用服务外再包一层 Repository/UnitOfWork 抽象。`DbContext` 已是仓储 + 工作单元，别叠床架屋。

## 适用版本

分层与版本无关；示例面向 net8+（Minimal API、EF Core）。

## 参考资料

- [领域驱动设计](ddd.md) · [整洁架构](clean-architecture.md) · [垂直切片](vertical-slice.md)
- [EF Core 数据访问（DbContext 即 UoW）](../dotnet/ef-core/ef-data-access.md)
- 官方文档：[面向 DDD 的微服务设计](https://learn.microsoft.com/dotnet/architecture/microservices/microservice-ddd-cqrs-patterns/ddd-oriented-microservice) · [领域模型层设计](https://learn.microsoft.com/dotnet/architecture/microservices/microservice-ddd-cqrs-patterns/net-core-microservice-domain-model)
