---
title: 领域服务与应用服务（+ DTO 手写映射）
summary: 模块内部——领域服务承载跨聚合业务，应用服务编排用例/DTO 边界/事务边界；手写映射不用 AutoMapper；AOT 友好。
tags: [architecture, ddd, application-service, domain-service, dto]
introduced-in: general
applies-to: [net8, net9, net10]
status: stable
source: https://learn.microsoft.com/dotnet/architecture/microservices/microservice-ddd-cqrs-patterns/ddd-oriented-microservice
updated: 2026-07-11
---

# 领域服务与应用服务（+ DTO 手写映射）

> **要点速览**
> - **定位**：两者都在**模块内部（Module-Internal）**（见[三种架构不在同一层级](solution-structure.md#arch-levels)）。领域服务在 Domain 层，应用服务在 Application 层。
> - **领域服务**：放不进单个实体的**跨聚合业务逻辑**，无状态、属领域层。
> - **应用服务**：编排用例、接收/返回 **DTO**、是**事务边界**（一次 `SaveChanges` = 一个 UoW）。
> - 应用服务**不写核心业务**，只协调；核心规则在领域层。
> - DTO 边界**手写映射**（投影/LINQ），不引 AutoMapper（第三方且已商用，[P10](../governance/policy.md)）。

## 概述

DDD 分层里有两类"服务"，职责必须分清：

| | 领域服务 Domain Service | 应用服务 Application Service |
|---|--------------------------|------------------------------|
| 所在层 | Domain | Application |
| 职责 | 跨多个聚合、放不进任何单个实体的纯业务逻辑 | 编排用例：收 DTO → 调领域 → 持久化 → 返 DTO |
| 是否含业务规则 | **含**（领域规则本身） | **不含**（只是协调，规则在领域） |
| 状态 | 无状态 | 无状态（靠注入的依赖） |
| 事务 | 不控制 | **是事务边界**（一次 `SaveChanges`） |

应用服务的事务边界 = 一次 `SaveChanges`，而 `DbContext` 本身就是工作单元（UoW），所以**无需再造 UoW 抽象**（沿用 [EF 数据访问](../dotnet/ef-core/ef-data-access.md)）。

本库取舍：**不用控制器**——用 [Minimal API](../dotnet/aspnet-core/aspnet-core-10.md) 端点直接调用应用服务；**不用 AutoMapper**——DTO 与实体之间**手写映射**，几行投影既清晰又零依赖。

## 正确做法

### 1. 领域逻辑在领域，应用服务只编排

```csharp
// 应用服务：编排用例，DTO 进 DTO 出，事务边界
public sealed class OrderAppService(AppDbContext db, PricingService pricing)   // PricingService 是领域服务
{
    public async Task<OrderDto> PlaceAsync(CreateOrderDto input, CancellationToken ct)
    {
        var order = Order.Create(input.Sku, input.Qty);  // 业务规则在领域对象里
        order.SetPrice(pricing.Quote(order));             // 跨聚合逻辑在领域服务
        db.Orders.Add(order);
        await db.SaveChangesAsync(ct);                    // 一次提交 = 一个工作单元
        return Map(order);                                // 手写映射，不用 AutoMapper
    }

    private static OrderDto Map(Order o) => new(o.Id, o.Sku, o.Qty, o.Total);
}

app.MapPost("/orders", async (CreateOrderDto dto, OrderAppService svc) => Results.Ok(await svc.PlaceAsync(dto, default)));
```

### 2. DTO 映射：投影优先

- **读路径**：用 LINQ `Select` 直接投影成 DTO，连实体都不用物化（见 [EF 查询性能](../dotnet/ef-core/query-performance.md)）。
- **写路径**：手写一行 `Map`/`ToEntity`，清晰可调试。
- 当应用服务就是"薄薄编排一层"时，也可由 Minimal API 端点 + [CQRS](cqrs.md) 处理器直接承担应用服务职责——不需要为分层而分层。

### 3. 何时用领域服务？决策表

| 场景 | 放哪 |
|------|------|
| 逻辑只涉及单个聚合内部 | 聚合根的方法（如 `Order.AddLine`） |
| 逻辑跨多个聚合、无状态计算 | 领域服务（如 `PricingService.Quote`） |
| 单实体 CRUD、无跨聚合规则 | 直接 `DbContext`，无需服务类 |
| 编排用例 + DTO + 事务 | 应用服务 |

## 常见误区

❌ **核心业务规则写进应用服务（甚至端点/控制器）**，领域层沦为贫血数据袋。规则归领域对象/领域服务，应用服务只编排。

❌ **直接把 EF 实体序列化返回客户端**——泄漏内部结构、产生循环引用与过度暴露。用 DTO 作边界。

❌ **引入 AutoMapper 做映射**。它是第三方且已商用（[P10](../governance/policy.md) 不用）；手写 `Map`/LINQ 投影更透明、可调试、零依赖。

❌ **在应用服务外再包 Repository/UoW 抽象**。`DbContext` 已是仓储 + 工作单元，别叠床架屋。

❌ **应用服务过胖**，把编排变成"大杂烩服务"。一个应用服务应对应一组相关用例；若膨胀，考虑[垂直切片](vertical-slice.md)按功能切分。

## 适用版本

分层与版本无关；示例面向 net8+（Minimal API、主构造函数、EF Core）。

### Native AOT 兼容性

应用服务/领域服务是普通 C#、构造注入，**AOT 安全**（✅，[P16](../governance/policy.md)、[AOT 矩阵](../dotnet/aot/aot-compatibility.md)）。DTO 进出走 JSON，需 `System.Text.Json` **源生成**（见 [序列化](../dotnet/csharp/serialization.md)）；查询投影（`Select` 到 DTO）在 AOT 下无反射问题。

## 在体系中的位置（何时引入）

- **领域服务**：逻辑跨越多个聚合、不属于任一实体时（如转账涉及两个账户）。
- **应用服务**：编排用例、划定事务边界、做 DTO 边界与协调；不写业务逻辑。
- 领域逻辑永远在 [实体](entities.md)/[值对象](value-objects.md)/[领域事件](domain-events.md)，不在应用服务里堆过程代码。

## 与其他模式的关系

- 应用服务接收/返回 [DTO](dto.md)；映射手写（不用 AutoMapper，[POLICY P10](../governance/policy.md)）。
- 落在 [整洁架构](clean-architecture.md)/[六边形架构](hexagonal-architecture.md) 内层；配合 [CQRS](cqrs.md) 的命令侧。
- 见 [架构总览与决策指南](overview.md) 学习路径第 4 步。

## 参考资料

- [领域驱动设计](ddd.md) · [整洁架构](clean-architecture.md) · [垂直切片](vertical-slice.md) · [CQRS](cqrs.md)
- [EF Core 数据访问（DbContext 即 UoW）](../dotnet/ef-core/ef-data-access.md) · [AOT 兼容性矩阵](../dotnet/aot/aot-compatibility.md)
- 官方文档：[面向 DDD 的微服务设计](https://learn.microsoft.com/dotnet/architecture/microservices/microservice-ddd-cqrs-patterns/ddd-oriented-microservice) · [领域模型层设计](https://learn.microsoft.com/dotnet/architecture/microservices/microservice-ddd-cqrs-patterns/net-core-microservice-domain-model)
