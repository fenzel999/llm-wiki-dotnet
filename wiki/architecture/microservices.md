---
title: 微服务架构（Microservices）
summary: 系统形态之一——按业务能力拆成自治、独立部署、各自拥有数据的小服务；与模块化单体是同一模块代码的二态之一。
tags: [architecture, microservices]
introduced-in: general
applies-to: [net8, net9, net10]
status: stable
source: https://learn.microsoft.com/dotnet/architecture/microservices/
updated: 2026-07-10
---

# 微服务架构（Microservices）

> **要点速览**
> - 微服务是**系统形态（System-Level）**之一：把应用拆成**围绕业务能力、自治、独立部署、各自拥有数据**的服务。它与[模块化单体](modular-monolith.md)是**同一份模块代码的两种部署形态**——不是另一套内部设计（内部仍用[整洁架构](clean-architecture.md)）。
> - 真实代价（网络不可靠、最终一致、运维复杂）：**多数应用应先模块化单体**，边界稳定后再按需抽取。
> - 服务间**不共享数据库**（共享=分布式单体）；跨服务调用加[弹性](../dotnet/fundamentals/resilience.md)、走明确契约（typed HttpClient）。
> - 解耦用异步[事件](event-driven.md)；全链路[可观测性](../dotnet/fundamentals/observability.md)是刚需。
> - 与 [.NET Aspire](../cloud-native/aspire.md) 协作：Aspire 负责编排这些服务/容器的启动、连接与可观测，不影响代码内部分层。

> **在体系中的位置**：第 1 步 · 边界形态。先读 [架构总览与决策指南](overview.md)；与 [模块化单体](modular-monolith.md) 是二态；每服务内部仍用整洁/六边形 + DDD 战术；跨服务用 [事件驱动](event-driven.md)+[Saga](saga.md)，边缘用 [API 网关与 BFF](api-gateway-bff.md)。

## 概述

微服务把一个应用拆成一组**围绕业务能力划分、各自独立部署、各自拥有数据**的小服务，服务间通过网络（HTTP/gRPC 或消息）通信。好处：团队独立开发部署、按需单独扩缩、技术栈可局部演进、故障可隔离。代价同样真实：网络不可靠、跨服务没有分布式事务只能最终一致、可观测性与运维复杂度陡增。

关键定位（与[解决方案分层](solution-structure.md#arch-levels)一致）：**微服务处在「系统形态」这一层**，而服务**内部**的代码仍然用整洁架构/DDD 分层。所以"选微服务"回答的是"怎么部署与拆边界"，不是"代码怎么分层"。它和模块化单体是**同一个模块的两态**——只要跨模块只依赖契约（见 [二态部署](modular-monolith.md#二态部署)），把某个模块抽出进程、换成远程客户端 + 集成事件即可，模块内部几乎不动。

## 正确做法

### 1. 服务边界 = 业务能力，数据各自独占

每个服务拥有自己的数据库（Database-per-Service），通过明确契约通信，绝不共享库：

```csharp
// 订单服务：通过类型化 HttpClient 调库存服务（明确边界、AOT 友好）
public class InventoryClient(HttpClient http)
{
    public async Task<bool> IsInStockAsync(string sku, CancellationToken ct)
        => await http.GetFromJsonAsync<bool>($"/stock/{sku}", ct);
}
```

### 2. 同步 vs 异步，按耦合需要选

| 通信 | 适用 | 注意 |
|------|------|------|
| HTTP/gRPC（同步） | 需要即时应答、强一致读 | 链式调用要加[弹性](../dotnet/fundamentals/resilience.md)，避免雪崩 |
| 消息/事件（异步） | 解耦、削峰、跨服务副作用 | 用[事件驱动](event-driven.md) + 发件箱保证可靠投递 |

### 3. 跨服务一致性靠"最终一致"

没有分布式事务。用**集成事件 + 发件箱模式**（业务与"待发事件"同事务写库，后台投递到消息中间件）保证至少一次投递，消费方做**幂等**：

```csharp
// 订单服务写库后发集成事件；库存服务幂等消费
await db.Orders.AddAsync(order, ct);
await db.Outbox.AddAsync(new OutboxMessage("OrderPlaced", payload), ct);  // 同事务
await db.SaveChangesAsync(ct);   // 后台任务读 Outbox 投递到消息总线
```

### 4. 用 Aspire 编排（部署层，与代码结构正交）

Aspire 把多个服务/容器编排成一个可一键启动的 App Host，统一配置与可观测性——它**不关心**服务内部是整洁架构还是别的（见 [.NET Aspire](../cloud-native/aspire.md)）。

## 常见误区

❌ **小团队简单应用一上来就十几微服务**，运维/调试成本压垮团队。先[模块化单体](modular-monolith.md)，边界稳了再拆。

❌ **多服务共享同一数据库**——表面微服务、实则"分布式单体"，数据库成了隐藏的强耦合点。每服务独占数据。

❌ **同步链式长调用**，一个慢全崩。用异步消息解耦，同步路径全程加[弹性策略](../dotnet/fundamentals/resilience.md)。

❌ **跨服务用分布式事务/两阶段提交**硬求强一致，把可用性压垮。改用最终一致 + 幂等消费。

❌ **把微服务当"代码分层方案"**。它是系统形态；服务内部仍有领域/应用/基础设施分层。分层与拆服务是两件不同层级的事。

## 适用版本

架构形态与版本无关；net8+ 的 AOT/精简容器（[容器化](../cloud-native/containers.md)）更适合微服务。

### Native AOT 兼容性

微服务**后端可全量 AOT**（✅，[P16](../governance/policy.md)、[AOT 矩阵](../dotnet/aot/aot-compatibility.md)）：每个服务用 Minimal API + 显式 DI，typed HttpClient、`IHttpClientFactory` 均 AOT 安全；JSON 走源生成。注意 JWT Bearer 作认证（Cookie/OIDC 不兼容 AOT，见 [auth](../dotnet/aspnet-core/auth.md)）。

## 何时使用

- 仅在**部署/团队强制**时才选：多个团队需独立部署、或不同部分伸缩曲线差异巨大、或需独立技术栈/故障隔离。
- 模块化单体已把边界画清仍不够承载时，再拆——不要一上来就微服务。
- 记住：微服务是"更贵的部署形态"，用运维复杂度换独立部署与伸缩。

## 与其他模式的关系

- 与 [模块化单体](modular-monolith.md) 是二态；模块划分方式一致，只是部署单元变了。
- 每个服务内部仍用 [整洁架构](clean-architecture.md) / [六边形架构](hexagonal-architecture.md) + DDD 战术构件。
- 跨服务一致用 [事件驱动](event-driven.md)（集成事件 + 发件箱）+ [Saga](saga.md)；边缘聚合用 [API 网关与 BFF](api-gateway-bff.md)。
- 服务边界即 [限界上下文](bounded-context.md)；重大取舍写 [ADR](adr.md)。
- 见 [架构总览与决策指南](overview.md) 的进阶跨进程栈。

## 参考资料

- [模块化单体架构（二态部署）](modular-monolith.md) · [整洁架构（模块内分层）](clean-architecture.md) · [解决方案分层](solution-structure.md)
- [事件驱动架构](event-driven.md) · [弹性与容错](../dotnet/fundamentals/resilience.md)
- [.NET Aspire（部署编排）](../cloud-native/aspire.md) · [AOT 兼容性矩阵](../dotnet/aot/aot-compatibility.md)
- 官方文档：[.NET 微服务架构](https://learn.microsoft.com/dotnet/architecture/microservices/)
