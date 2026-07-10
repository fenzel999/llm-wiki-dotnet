---
title: 事件驱动架构（Event-Driven）
summary: 横切能力——用事件解耦生产者与消费者；区分领域事件（进程内同事务）与集成事件（跨服务+发件箱）；消费者须幂等。
tags: [architecture, event-driven, messaging, domain-event, outbox]
introduced-in: general
applies-to: [net8, net9, net10]
status: stable
source: https://learn.microsoft.com/dotnet/architecture/microservices/architect-microservice-container-applications/communication-in-microservice-architecture
updated: 2026-07-11
---

# 事件驱动架构（Event-Driven）

> **要点速览**
> - **定位**：事件驱动是**横切能力（Cross-Cutting）**——跨模块/服务解耦通信的方式（见[三种架构不在同一层级](solution-structure.md#arch-levels)）。
> - 核心：**发"已发生某事"的事件**，消费者自行订阅；生产者不认识消费者，解耦带来弹性与可扩展。
> - 两层：① **领域事件**（进程内、随 `SaveChanges` 同事务分发，见 [domain-events](domain-events.md)）；② **集成事件**（跨服务，需消息中间件 + 发件箱）。
> - 跨服务可靠投递用**发件箱模式（Outbox）**：业务变更与待发事件**同一事务**，后台再投递。
> - 消费者必须**幂等**（消息中间件通常"至少投递一次"会重复）。

## 概述

事件驱动架构的思路：组件之间不直接命令彼此"去做某事"，而是**发布"已经发生了某事"的事件**，任何关心的消费者自行订阅响应。生产者不知道也不关心谁在消费——这种**解耦**带来：

- **弹性**：消费者挂了不影响生产者（消息堆积，恢复后继续）。
- **可扩展**：加新消费者不改生产者（开闭原则）。
- **削峰**：用队列缓冲突发流量。

但事件驱动不只是一句话，要分清两个层次（这也是本库刻意区分的两套实现）：

| 维度 | 领域事件 Domain Event | 集成事件 Integration Event |
|------|------------------------|----------------------------|
| 传播范围 | 同一进程 / 同一模块内 | 跨服务 / 跨模块 |
| 事务 | 与业务变更**同事务**（一致） | 经发件箱**最终一致** |
| 实现 | 进程内手写分发器（见 [domain-events](domain-events.md)） | 消息中间件 + Outbox |
| 失败语义 | 一起回滚 | 至少一次投递，消费端幂等 |

## 正确做法

### 1. 进程内：领域事件（不引第三方总线）

聚合收集、随 `SaveChanges` 派发，见 [domain-events](domain-events.md)。这里给分发器骨架：

```csharp
public interface IDomainEvent { }
public interface IEventHandler<in T> where T : IDomainEvent { Task Handle(T e, CancellationToken ct); }

public sealed class DomainDispatcher(IEnumerable<IEventHandler<IDomainEvent>> handlers)
{
    public async Task Publish<T>(T e, CancellationToken ct) where T : IDomainEvent
    {
        foreach (var h in handlers.OfType<IEventHandler<T>>())
            await h.Handle(e, ct);
    }
}
```

### 2. 跨服务：发件箱模式（Outbox）保证可靠投递

跨服务的经典难题："改数据库"和"发消息"要**原子完成**。若先存库再发消息，存成功但消息发送失败就会丢事件。发件箱模式把两者纳入**同一个本地事务**：

```csharp
// 业务与"待发事件"同事务写库
await using var tx = await db.Database.BeginTransactionAsync(ct);
await db.Orders.AddAsync(order, ct);
await db.Outbox.AddAsync(new OutboxMessage(
    Type: "OrderPlaced",
    Payload: JsonSerializer.Serialize(new OrderPlaced(order.Id))), ct);
await db.SaveChangesAsync(ct);
await tx.CommitAsync(ct);   // 此刻库里既有订单、也有待发事件
// 后台 IHostedService 读 Outbox → 投递到消息中间件 → 成功后标记 Sent
```

中间件选**可自托管的开源方案**（如 RabbitMQ / NATS，不绑定付费云，见 [P12](../governance/policy.md)）。

### 3. 消费者必须幂等

消息中间件一般保证**至少一次投递**（at-least-once），同一事件可能重复到达。消费端用**幂等键**（事件 id 或业务键）去重：

```csharp
public sealed class OrderPlacedHandler(AppDbContext db)
{
    public async Task Handle(OrderPlaced e, CancellationToken ct)
    {
        if (await db.ProcessedEvents.AnyAsync(p => p.EventId == e.EventId, ct))
            return;                       // 已处理过，跳过
        // ...处理副作用（如发货）...
        await db.ProcessedEvents.AddAsync(new ProcessedEvent(e.EventId), ct);
        await db.SaveChangesAsync(ct);
    }
}
```

## 常见误区

❌ **先存库、再发消息、不在同一事务**——存成功但发消息失败，事件永久丢失。用发件箱把两者纳入一个事务（见上文）。

❌ **消费者不做幂等**。至少一次投递会重复到达，非幂等消费会重复扣款/下单。用幂等键（去重表/业务键）保证"重复来也不出错"。

❌ **为进程内简单通知强上重型消息中间件**（RabbitMQ/NATS 全栈部署），凭空增加运维负担。进程内通知用领域事件（手写分发器），只有**跨服务**才上消息中间件。

❌ **用领域事件做跨服务通信**。领域事件是进程内、同事务的；跨服务要在处理器里再发**集成事件** + 发件箱。

❌ **事件命名用将来时/命令式**（`SendEmail`）。事件是"已发生的事"，用过去式（`EmailSent`）——它描述事实，不该暗示"必须有人去做"。

## 适用版本

模式与版本无关，全版本适用；`ISaveChangesInterceptor`（net6+）用于领域事件派发。

### Native AOT 兼容性

- **领域事件**：手写分发器靠 DI 解析处理器、`OfType` 过滤，无运行期反射，**AOT 安全**（见 [domain-events](domain-events.md)）。
- **集成事件 / Outbox**：后台投递是普通 [BackgroundService](../dotnet/fundamentals/background-services.md)（AOT 安全）；消息客户端库若用 JSON 反序列化需 `System.Text.Json` **源生成**（见 [序列化](../dotnet/csharp/serialization.md)）；选 AOT 友好的开源中间件客户端。

## 参考资料

- [领域事件（进程内、同事务）](domain-events.md) · [微服务架构（跨服务）](microservices.md)
- [后台服务（消费者）](../dotnet/fundamentals/background-services.md) · [弹性与容错（重试/熔断）](../dotnet/fundamentals/resilience.md)
- [审计与软删除（同为 SaveChanges 拦截器）](auditing-soft-delete.md) · [AOT 兼容性矩阵](../dotnet/aot/aot-compatibility.md)
- 官方文档：[微服务架构中的通信](https://learn.microsoft.com/dotnet/architecture/microservices/architect-microservice-container-applications/communication-in-microservice-architecture)
