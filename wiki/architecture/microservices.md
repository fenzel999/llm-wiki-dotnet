---
title: 微服务架构（Microservices）
summary: 按业务能力拆成自治、独立部署的小服务；先想清代价，多数应用应从模块化单体起步。
tags: [architecture, microservices]
introduced-in: general
applies-to: [all]
status: stable
source: https://learn.microsoft.com/dotnet/architecture/microservices/
updated: 2026-07-10
---

> **要点速览**
> - 按业务能力拆成自治、独立部署、各自拥有数据的小服务。
> - 代价真实（网络、最终一致、运维复杂）：**多数应用应先[模块化单体](modular-monolith.md)**，需要时再拆。
> - 服务间不共享数据库（共享=分布式单体）；跨服务调用必加[弹性](../dotnet/fundamentals/resilience.md)。
> - 全链路[可观测性](../dotnet/fundamentals/observability.md)是刚需；解耦用异步[事件](event-driven.md)。

## 概述

微服务把一个大应用拆成一组**围绕业务能力划分、各自独立部署、各自拥有数据**的小服务，服务间通过网络（HTTP/gRPC 或消息）通信。好处很诱人：团队可独立开发部署、按需单独扩缩、技术栈可局部演进、故障可隔离。但代价同样真实：分布式系统的网络不可靠、数据一致性变难（跨服务没有分布式事务，只能最终一致）、可观测性与运维复杂度陡增。

一句忠告贯穿始终：**不要一开始就上微服务**。绝大多数应用应从[模块化单体](modular-monolith.md)起步——先在单体内划清模块边界，等边界稳定、团队和负载确实需要时，再把某些模块拆成服务。过早微服务化是常见的、代价高昂的错误。

## 正确做法

每个服务独立拥有数据、通过明确契约通信；服务间不共享数据库：

```csharp
// 订单服务通过类型化 HttpClient 调用库存服务（明确的服务边界）
public class InventoryClient(HttpClient http)
{
    public async Task<bool> IsInStockAsync(string sku)
        => await http.GetFromJsonAsync<bool>($"/stock/{sku}");
}
```

- 服务间同步调用用 HTTP/gRPC；解耦与削峰用消息/事件（见 [事件驱动](event-driven.md)）。
- 跨服务调用必须加[弹性策略](../dotnet/fundamentals/resilience.md)（重试+熔断+超时）。
- 全链路[可观测性](../dotnet/fundamentals/observability.md)是微服务的刚需，不是可选项。

## 常见误区

❌ 为了"赶时髦"把小团队的简单应用拆成十几个服务，运维和调试成本压垮团队。先模块化单体，需要时再拆。

❌ 多个服务共享同一个数据库，表面是微服务、实则紧耦合（"分布式单体"）。每个服务独占自己的数据。

❌ 服务间用同步链式调用串成一长条，一个慢则全崩。用异步消息解耦，并全程加弹性策略。

## 适用版本

架构风格与版本无关；.NET 各版本均可构建，net8+ 的 AOT/精简容器更适合微服务。

## 参考资料

- [模块化单体架构](modular-monolith.md)
- [事件驱动架构](event-driven.md)
- [弹性与容错](../dotnet/fundamentals/resilience.md)
- 官方文档：[.NET 微服务架构](https://learn.microsoft.com/dotnet/architecture/microservices/)
