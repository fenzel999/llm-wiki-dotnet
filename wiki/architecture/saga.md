---
title: Saga（补偿式分布式事务 / 流程管理器）
summary: 在无需分布式 2PC 的前提下，用一系列本地事务加补偿操作保证跨服务一致性；含编排、协同两种风格与 Native AOT 要点。
tags: [architecture, saga, distributed-transactions, dotnet]
introduced-in: general
applies-to: [all]
status: stable
source: https://learn.microsoft.com/en-us/azure/architecture/patterns/saga
updated: 2026-07-11
---

> **要点速览**
> - Saga 把跨服务的「分布式事务」拆成一组本地事务，每一步都有对应的**补偿事务**用于回滚。
> - 两种实现风格：**编排（orchestration）**由中央协调器驱动，**协同（choreography）**由各服务监听事件自发反应。
> - Saga 不提供隔离性（与 2PC 的本质区别），必须靠**幂等**与**去重**避免重复执行。
> - 可靠消息是前提：用 **Outbox 模式**先落库再投递，避免本地事务成功但消息丢失。
> - 不要对一致性要求极高、或只涉及单库的场景滥用 Saga；它更适合长事务、跨服务业务流。

## 概述

在 [微服务](../architecture/microservices.md) 架构里，一次业务操作常常要跨多个服务写数据。传统的两阶段提交（2PC）用全局锁保证原子性，但会长时间占用资源、且要求所有参与者同时在线，在分布式与云原生环境中扩展性差、可用性低。

**Saga** 模式放弃了「全有或全无」的强原子性，改为：把整个流程拆成若干**本地事务**，每个本地事务提交后立即发布一个事件或命令；如果某一步失败，则按相反顺序执行之前各步的**补偿事务（compensating transaction）**，把已提交的影响撤销或抵消。

Saga 的关键特征：

1. **无分布式锁、无全局事务**：每一步都是各自服务内的本地事务，彼此不阻塞。
2. **最终一致性**：系统在一段时间后达到一致，而不是瞬时一致。
3. **补偿而非回滚**：补偿是「反向业务操作」（如取消订单、解冻额度），不是数据库 `ROLLBACK`。
4. **依赖可靠消息**：消息可能重复、可能乱序，Saga 必须对此鲁棒。

Saga 与 [事件驱动](../architecture/event-driven.md)、[领域事件](../architecture/domain-events.md)、[CQRS](../architecture/cqrs.md) 关系紧密：领域事件通常就是 Saga 各步之间的「信号」，而 Saga 本身也可视为一个**流程管理器（process manager）**——一个以状态机方式响应事件的长期运行过程。（它与 [事件溯源](../architecture/event-sourcing.md) 互补：事件溯源把状态表达为事件流，Saga 则是跨聚合/跨服务的协调逻辑。）

### 编排 vs 协同

| 维度 | 编排 Orchestration | 协同 Choreography |
| --- | --- | --- |
| 控制流 | 集中式协调器（Saga Orchestrator） | 去中心化，服务间通过事件互相触发 |
| 可观测性 | 强，协调器知道全局状态 | 弱，需聚合各服务日志才能还原流程 |
| 耦合 | 各服务耦合到协调器协议 | 服务仅耦合到事件契约 |
| 调试 | 一处看流程 | 需追踪事件链 |
| 适用 | 流程复杂、步骤多、需强控制 | 步骤少、参与者彼此独立 |

## 正确做法

### 1. 协同式 Saga（Choreography）

每个服务在自己的本地事务提交后发布事件，下游服务订阅并继续推进，失败时发布补偿事件。

```csharp
// 共享契约：领域事件
public record OrderPlaced(Guid OrderId, Guid CustomerId, decimal Amount);
public record OrderReserved(Guid OrderId);
public record InventoryFailed(Guid OrderId);
public record CreditReserved(Guid OrderId);
public record CreditFailed(Guid OrderId);

// 库存服务：监听下单，预留库存
public class InventoryHandler
{
    private readonly IMessageBus _bus;
    private readonly IRepository _repo;

    public async Task Handle(OrderPlaced e, CancellationToken ct)
    {
        // 本地事务：预留库存
        if (await _repo.TryReserveAsync(e.OrderId, e.Amount, ct))
        {
            await _bus.Publish(new OrderReserved(e.OrderId), ct);
        }
        else
        {
            // 失败：发出补偿信号，触发上游回滚
            await _bus.Publish(new InventoryFailed(e.OrderId), ct);
        }
    }
}

// 信用服务：监听下单，冻结额度
public class CreditHandler
{
    private readonly IMessageBus _bus;
    private readonly IRepository _repo;

    public async Task Handle(OrderPlaced e, CancellationToken ct)
    {
        if (await _repo.TryFreezeAsync(e.CustomerId, e.Amount, ct))
        {
            await _bus.Publish(new CreditReserved(e.OrderId), ct);
        }
        else
        {
            await _bus.Publish(new CreditFailed(e.OrderId), ct);
        }
    }
}

// 订单服务：监听失败信号，执行补偿（取消订单）
public class OrderCompensationHandler
{
    private readonly IRepository _repo;

    public async Task Handle(InventoryFailed e, CancellationToken ct)
        => await _repo.CancelAsync(e.OrderId, ct);

    public async Task Handle(CreditFailed e, CancellationToken ct)
        => await _repo.CancelAsync(e.OrderId, ct);
}
```

要点：每个服务的 `Handle` 都在**自身本地事务**内完成写库 + 发事件，且对「失败事件」进行补偿。

### 2. 编排式 Saga（Orchestration）—— 状态机 / 流程管理器

中央协调器持有 Saga 状态，根据收到的回复推进或补偿。状态用持久化存储保存，重启后可恢复。

```csharp
public enum SagaState { Started, InventoryOk, CreditOk, Completed, Compensating, Failed }

public class OrderSaga
{
    public Guid SagaId { get; set; }
    public Guid OrderId { get; set; }
    public Guid CustomerId { get; set; }
    public decimal Amount { get; set; }
    public SagaState State { get; set; }

    private readonly IMessageBus _bus;
    private readonly ISagaStore _store;

    public async Task Start(OrderPlaced cmd, CancellationToken ct)
    {
        State = SagaState.Started;
        await _store.SaveAsync(this, ct);
        // 第一步：请库存服务预留
        await _bus.Send(new ReserveInventory(OrderId, Amount), ct);
    }

    // 收到库存回复：用封闭 switch 推进状态机
    public async Task On(InventoryReserved e, CancellationToken ct)
    {
        if (State != SagaState.Started) return; // 幂等守卫
        State = SagaState.InventoryOk;
        await _store.SaveAsync(this, ct);
        await _bus.Send(new FreezeCredit(CustomerId, Amount), ct);
    }

    public async Task On(CreditReserved e, CancellationToken ct)
    {
        if (State != SagaState.InventoryOk) return;
        State = SagaState.Completed;
        await _store.SaveAsync(this, ct);
        await _bus.Publish(new OrderConfirmed(OrderId), ct);
    }

    // 任一步失败：反向补偿
    public async Task On(ReserveFailed e, CancellationToken ct)
    {
        if (State is SagaState.Completed or SagaState.Failed) return;
        State = SagaState.Failed;
        await _store.SaveAsync(this, ct);
        await _bus.Publish(new OrderCancelled(OrderId), ct);
    }

    public async Task On(FreezeFailed e, CancellationToken ct)
    {
        if (State != SagaState.InventoryOk) return;
        State = SagaState.Compensating;
        await _store.SaveAsync(this, ct);
        // 反向补偿已成功的库存步骤
        await _bus.Send(new ReleaseInventory(OrderId, Amount), ct);
        State = SagaState.Failed;
        await _store.SaveAsync(this, ct);
        await _bus.Publish(new OrderCancelled(OrderId), ct);
    }
}
```

`OrderSaga` 就是经典「流程管理器」：它**不持有业务数据本身**，只持有流程进度，并命令其他服务做事。状态机用 `switch`/`if` 显式分支，便于推理和测试。

### 3. 幂等 + 去重（按消息 Id）

消息至少一次投递意味着同一条事件可能到多次。所有处理方必须按 `MessageId` 去重：

```csharp
public class IdempotentDispatcher
{
    private readonly IProcessedMessages _seen;

    public async Task DispatchAsync<T>(T message, Func<T, Task> handler, CancellationToken ct)
        where T : IMessage
    {
        // 本地事务内：标记已处理，重复则跳过
        if (await _seen.TryMarkAsync(message.MessageId, ct))
            return;
        await handler(message);
        await _seen.CommitAsync(ct);
    }
}

public interface IMessage { Guid MessageId { get; } }
```

把「标记 MessageId」与「业务写入」放进**同一个本地事务**，才能保证恰好一次语义。

### 4. Outbox 模式：可靠消息的基础

Saga 的前提是「本地事务提交后事件一定被投递」。直接在同一事务里既写业务表又发消息做不到原子（消息中间件不在 DB 事务内）。**Outbox 模式**解决此问题：

```csharp
// 同一本地事务内：业务写入 + 写入 Outbox 表
await using var tx = await connection.BeginTransactionAsync(ct);
await connection.ExecuteAsync(
    "INSERT INTO Orders ...", new { orderId }, tx);
await connection.ExecuteAsync(
    "INSERT INTO Outbox(MessageId, Topic, Payload, CreatedAt) VALUES (@id, @t, @p, @c)",
    new { id = msgId, t = "OrderPlaced", p = json, c = DateTime.UtcNow }, tx);
await tx.CommitAsync();

// 独立后台投递器：扫描 Outbox 并发送，发送成功后标记/删除
// 保证「本地已提交 ⇒ 消息最终被投递」，且配合幂等避免重复副作用
```

有了 Outbox，Saga 各步才不会因进程崩溃而丢失「下一步该做什么」的消息。

## 常见误区

❌ **用 Saga 替代 2PC 期望强原子性 / 隔离性。**
✅ Saga 只保证**最终一致性**，没有隔离级别。两个并发 Saga 可能读到彼此的中间状态（脏读/丢失更新）。WHY：Saga 不持有全局锁，补偿发生在「已提交」之后，无法阻止并发流程介入。若业务必须强一致，应重新聚合服务边界，而不是强行用 Saga 模拟事务。

❌ **补偿事务写成 `DELETE`/反向 SQL，而非业务反向操作。**
✅ 补偿必须是**语义等价**的反向业务动作（如「解冻额度」而非「删掉冻结记录」）。WHY：其他流程可能已经基于中间状态做出了决策；物理回滚会破坏这些下游已发生的真实影响，且补偿本身要能失败重试、要保证幂等。

❌ **忘记幂等，假设消息只到达一次。**
✅ 每个处理方必须按 `MessageId` 去重，并把去重标记与业务写入放在同一事务。WHY：消息中间件通常只保证「至少一次」，网络重试、协调器重启都会造成重复投递；没有幂等会导致库存被冻结两次、额度被扣两次。

❌ **在 Saga 里用 `Activator.CreateInstance` / `dynamic` 按消息名反射分发。**
✅ 用封闭的 `switch` 或显式 `On(...)` 重载处理已知消息类型。WHY：反射分发在 Native AOT 与剪裁（trimming）下会失效，且把控制流藏进字符串难以维护与测试。封闭类型分发才是可推理、可裁剪的写法。

❌ **把编排和协同混在同一流程：协调器既发命令，服务又自发电发事件互相触发。**
✅ 选定一种风格并保持纯粹：要么协调器全权驱动（编排），要么全靠事件链（协同）。WHY：混合会让「谁负责补偿」「当前进度在哪」变得模糊，补偿顺序错乱、重复补偿，且极难排查。

❌ **Saga 跨越过多服务（如 8+ 个），任一步失败都要连锁补偿。**
✅ 把流程收敛到 3–5 个关键步骤，过长链路拆分为子 Saga 或重新设计限界上下文。WHY：每多一步就多一份补偿复杂度与失败面；补偿链越长，部分补偿失败、需人工介入的概率越高。

## 适用版本

`introduced-in: general` — Saga 是架构模式，与具体 .NET 版本无关，可在 .NET Framework 4.x 到 .NET 8/9/10 的任意版本落地。落到实现：

- **System.Threading.Tasks / 托管服务**：用 `BackgroundService` 跑 Outbox 投递器与补偿扫描器。
- **System.Text.Json**：用于事件序列化，优先用**源生成（source-gen）**而非反射式 `JsonSerializer`，以便剪裁与 AOT。
- **Polly（.NET Foundation）**：若需重试/超时/熔断包裹跨服务调用，可引入作韧性策略，但 Saga 本身的补偿逻辑应手写，不应交给重试库「自动重试整个流程」。

### Native AOT 兼容性

Saga 的核心是「持久化状态 + 对事件做反应」，要能在 Native AOT / trimming 下编译运行，需遵守：

1. **不要运行时反射消息类型**：避免 `Type.GetType("OrderPlaced")`、`Activator.CreateInstance`、`JsonSerializer.Deserialize(json, Type)` 这类反射路径，AOT 无法为未知类型生成序列化代码。
2. **用源生成 JSON + 显式类型**：为所有事件定义 `record` 并配合 `[JsonSerializable]` 源生成器，反序列化时调用具体泛型重载 `JsonSerializer.Deserialize<OrderPlaced>(json)`。
3. **用判别联合 / 封闭 switch 分发**：把「事件种类」编码成封闭 `enum` 或 `OneOf`-式联合类型，协调器状态机用 `switch (e.Kind)` 处理，而不是依赖运行时类型判别。
4. **状态机是封闭分支**：`OrderSaga.On(...)` 对所有已知事件有显式重载/分支，`default` 分支记录未知事件即可，**不**动态加载处理程序。
5. **避免 `dynamic`、表达式树编译、运行时代码生成**：这些在 AOT 下不可用或性能极差。

只要消息契约是静态已知类型、分发是编译期闭合的，Saga 状态机完全可以 Native AOT 发布。

## 参考资料

- [Saga 模式（Microsoft Azure Architecture Patterns）](https://learn.microsoft.com/en-us/azure/architecture/patterns/saga)
- [.NET 微服务架构（Microsoft）](https://learn.microsoft.com/en-us/dotnet/architecture/microservices/)
- [微服务](../architecture/microservices.md)
- [事件驱动](../architecture/event-driven.md)
- [事件溯源](../architecture/event-sourcing.md)
- [CQRS](../architecture/cqrs.md)
- [领域事件](../architecture/domain-events.md)
