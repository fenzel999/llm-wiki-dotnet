---
title: 事件驱动架构（Event-Driven）
summary: 用事件解耦生产者与消费者，异步通信提升弹性；用领域事件与发件箱保证可靠投递。
tags: [architecture, event-driven, messaging, domain-event, outbox]
introduced-in: general
applies-to: [all]
status: stable
source: https://learn.microsoft.com/dotnet/architecture/microservices/architect-microservice-container-applications/communication-in-microservice-architecture
updated: 2026-07-10
---

> **要点速览**
> - 发布"已发生某事"的事件，消费者自行订阅——生产者不关心谁消费，实现解耦。
> - 领域事件（进程内，手写发布器即可）vs 集成事件（跨服务，用可自托管开源中间件）。
> - 跨服务可靠投递用**发件箱模式**：业务变更与待发事件同一事务，后台再投递。
> - 消费者必须**幂等**（至少投递一次会重复）；简单通知别上重型中间件。

## 概述

事件驱动架构的思路是：组件之间不直接命令彼此"去做某事"，而是**发布"已经发生了某事"的事件**，任何关心的消费者自行订阅响应。生产者不知道也不关心谁在消费——这种**解耦**带来弹性（消费者挂了不影响生产者）、可扩展（加新消费者不改生产者）和削峰（用队列缓冲突发流量）。

要区分两个层次：**领域事件（Domain Event）**在单个进程/上下文内传播（如聚合状态变化通知本地其他部分），常用进程内发布；**集成事件（Integration Event）**跨服务传播，需要消息中间件（可自托管的开源方案，不绑定付费云服务，见 [P12](../governance/policy.md)）。跨服务可靠投递的经典难题是"改数据库"和"发消息"要原子完成，标准解法是**发件箱模式（Outbox）**。

## 正确做法

进程内领域事件可用极简手写发布器（不引第三方总线）：

```csharp
public interface IDomainEvent { }
public record OrderPlaced(int OrderId) : IDomainEvent;

public interface IEventHandler<in T> where T : IDomainEvent { Task Handle(T e); }

public class Dispatcher(IEnumerable<object> handlers)      // 手写极简分发
{
    public async Task Publish<T>(T e) where T : IDomainEvent
    {
        foreach (var h in handlers.OfType<IEventHandler<T>>())
            await h.Handle(e);
    }
}
```

跨服务用**发件箱模式**保证一致：业务变更与"待发事件"写在**同一个数据库事务**里，再由后台任务读发件箱表投递到消息中间件，投递成功后标记完成。

## 常见误区

❌ 在同一个数据库事务外"先存库、再发消息"——存成功但发消息失败，事件永久丢失。用发件箱模式把两者纳入一个事务。

❌ 消费者不做**幂等**处理。消息中间件通常"至少投递一次"，同一事件可能重复到达，非幂等消费会重复扣款/重复下单。用幂等键去重。

❌ 为进程内的简单通知也强上重型消息中间件，凭空增加运维负担。进程内用领域事件（手写发布器），只有跨服务才上消息中间件。

## 适用版本

模式与版本无关，全版本适用。

## 参考资料

- [微服务架构](microservices.md)
- [后台服务（消费者）](../dotnet/fundamentals/background-services.md)
- [弹性与容错](../dotnet/fundamentals/resilience.md)
- 官方文档：[微服务架构中的通信](https://learn.microsoft.com/dotnet/architecture/microservices/architect-microservice-container-applications/communication-in-microservice-architecture)
