---
title: 领域事件（聚合收集 + 随工作单元分发）
summary: 聚合把"已发生的事"收进事件列表，在 SaveChanges 提交前用手写分发器派发给处理器，副作用与业务变更同一事务。
tags: [architecture, ddd, domain-event, aggregate, unit-of-work]
introduced-in: general
applies-to: [net8, net9, net10]
status: stable
source: https://learn.microsoft.com/dotnet/architecture/microservices/microservice-ddd-cqrs-patterns/domain-events-design-implementation
updated: 2026-07-10
---

# 领域事件

> **要点速览**
> - 聚合根把"已发生的事"（过去式命名，如 `OrderPlaced`）**加进自身事件列表**，不立即派发。
> - 在 `SaveChanges` **提交前**用手写分发器派发给处理器——副作用与业务变更在**同一事务**，一起成功或一起回滚。
> - 一个事件可有**任意多个处理器**（开闭原则）：加新副作用只加处理器，不改聚合。
> - 分发器手写即可（[P10](../governance/policy.md) 不引 MediatR）；跨服务副作用改用[集成事件 + 发件箱](event-driven.md)。

## 概述

当"对一个聚合执行命令"需要连带在**其它聚合**上跑规则时，最优雅的表达方式是**领域事件（Domain Event）**：聚合只负责声明"我这里发生了 `OrderPlaced`"，谁关心谁订阅，聚合本身不 `new` 任何副作用对象。这让副作用**显式**、**解耦**、且**对扩展开放**——业务日后要"下单满额送优惠券"，只需新增一个处理器，不动已测好的聚合代码。

关键技巧是**延迟分发（deferred dispatch）**：聚合调用 `AddDomainEvent` 只是把事件塞进内存列表，**不立即派发**；真正的派发放到 `SaveChanges` **提交前**统一进行。这样处理器产生的副作用（同一个作用域 `DbContext`）和原始变更被纳入**同一个事务**——`SaveChanges` 失败则全部回滚，天然一致。这与[事件驱动架构](event-driven.md)里跨进程的**集成事件**不同：领域事件是**进程内、同事务**的。

## 正确做法

实体基类收集事件；EF Core 拦截器在保存前用手写分发器派发：

```csharp
public interface IDomainEvent { }

// 处理器基类：编译期已知处理的事件类型（EventType），分发器据此过滤，无运行期反射
public interface IDomainEventHandler
{
    Type EventType { get; }
    Task Handle(object domainEvent, CancellationToken ct);
}
public abstract class DomainEventHandler<TEvent> : IDomainEventHandler where TEvent : IDomainEvent
{
    public Type EventType => typeof(TEvent);
    Task IDomainEventHandler.Handle(object domainEvent, CancellationToken ct)
        => Handle((TEvent)domainEvent, ct);
    protected abstract Task Handle(TEvent domainEvent, CancellationToken ct);
}

public abstract class Entity                                  // 实体基类：收集事件
{
    private readonly List<IDomainEvent> _events = [];
    public IReadOnlyList<IDomainEvent> DomainEvents => _events;
    protected void AddDomainEvent(IDomainEvent e) => _events.Add(e);
    public void ClearDomainEvents() => _events.Clear();
}

public sealed record OrderPlaced(Guid OrderId) : IDomainEvent;   // 过去式命名、不可变

public class Order : Entity
{
    public void Place() { /* ...改状态... */ AddDomainEvent(new OrderPlaced(Id)); }
}
```

```csharp
// 保存前派发：副作用与业务变更同一事务
public sealed class DomainEventInterceptor(IServiceProvider sp) : SaveChangesInterceptor
{
    public override async ValueTask<InterceptionResult<int>> SavingChangesAsync(
        DbContextEventData data, InterceptionResult<int> result, CancellationToken ct = default)
    {
        var entities = data.Context!.ChangeTracker.Entries<Entity>()
            .Where(e => e.Entity.DomainEvents.Count > 0).Select(e => e.Entity).ToArray();

        foreach (var entity in entities)
        {
            var events = entity.DomainEvents.ToArray();
            entity.ClearDomainEvents();
            foreach (var e in events)                         // 手写派发，不用 MediatR
            {
                // 闭包泛型 GetServices<IDomainEventHandler>() + 编译期已知的 EventType 过滤，
                // 无 MakeGenericType / GetMethod / Invoke 反射，Native AOT 安全
                foreach (var h in sp.GetServices<IDomainEventHandler>().Where(h => h.EventType == e.GetType()))
                    await h.Handle(e, ct);
            }
        }
        return await base.SavingChangesAsync(data, result, ct);
    }
}
```

## 常见误区

❌ 事件一 `Raise` 就**立即同步派发**给处理器。测试/调试时会突然跳进一堆副作用处理器，难以聚焦当前聚合。用延迟分发：先入列，`SaveChanges` 前再派发。

❌ 把领域事件处理器写进领域层。处理器要用到 `DbContext`/仓储等基础设施，属**应用层**关注点；领域层只管 `AddDomainEvent`。

❌ 用领域事件去做**跨服务**通信。领域事件是进程内、同事务的；跨服务要在处理器里再发**集成事件**，并用[发件箱模式](event-driven.md)保证可靠投递。

❌ 事件对象可变（带 setter）。事件是"已发生的事实"，应不可变——用 `record` + 只读属性。

## 适用版本

`ISaveChangesInterceptor` net6+；模式本身与版本无关。示例面向 net8+。

### Native AOT 兼容性

领域事件分发器靠闭包泛型 `GetServices<IDomainEventHandler>()` + 编译期已知的 `EventType` 过滤，无 `MakeGenericType`/`GetMethod`/`Invoke` 反射，**AOT 安全**（✅，[P16](../governance/policy.md)、[AOT 矩阵](../dotnet/aot/aot-compatibility.md)）。注意：若事件携带类型信息做反序列化，需 `System.Text.Json` **源生成**（见 [序列化](../dotnet/csharp/serialization.md)）。

## 参考资料

- [领域驱动设计](ddd.md) · [领域服务与应用服务](domain-application-services.md)
- [事件驱动架构（集成事件 / 发件箱）](event-driven.md)
- [审计与软删除（同为 SaveChanges 拦截器）](auditing-soft-delete.md)
- 官方文档：[领域事件：设计与实现](https://learn.microsoft.com/dotnet/architecture/microservices/microservice-ddd-cqrs-patterns/domain-events-design-implementation)
