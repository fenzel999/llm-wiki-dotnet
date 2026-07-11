---
title: 事件溯源 (Event Sourcing)
summary: 用只追加的事件流作为唯一事实来源，通过重放事件重建状态，而非持久化当前快照。
tags: [architecture, event-sourcing, cqrs, ddd]
introduced-in: general
applies-to: [all]
status: stable
source: https://learn.microsoft.com/en-us/azure/architecture/patterns/event-sourcing
updated: 2026-07-11
---

> **要点速览**
> - 事实来源是**事件流**，不是当前状态；状态由重放事件得到。
> - 写路径存"发生了什么"（命令→事件），读路径从事件**投影**出读模型。
> - 与 [CQRS](../architecture/cqrs.md) 天然互补，也与 [领域事件](../architecture/domain-events.md) 相关但不同（见区分）。
> - 必须解决**事件版本化/模式演进**，否则重放会崩。
> - 删除/GDPR 是 ES 的硬伤：不能物理删事件，只能追加"纠正"事件或加密/遗忘。
> - Native AOT 下避开按名 `Type.GetType` 反序列化，用封闭事件集 + 类型判别器 + 源生成。

## 概述

事件溯源（Event Sourcing, ES）是一种架构模式：把**对领域对象每一次状态变更的事实**以不可变、只追加（append-only）的事件形式持久化。系统的当前状态**不是**被直接存储的，而是通过对事件流从头到尾重放（replay）推导出来的。

这与传统 CRUD 形成对比：CRUD 只保留"最新值"，历史被覆盖丢失；ES 保留"发生了什么"的完整审计级历史。

要注意把 ES 与邻近概念区分开：

- 与 [事件驱动架构](../architecture/event-driven.md)：ES 关心**自身状态如何持久化**（用事件当存储），事件驱动关心**系统间如何通信**。ES 内部确实产生事件，但这些事件首先是自身的持久化机制，其次才可能被发布出去。
- 与 [领域事件](../architecture/domain-events.md)：领域事件是"已经发生的事实"这一建模概念，ES 把领域事件当作**持久化单元**来用。可以说 ES 是领域事件在存储层的一种落地方式，但领域事件本身不要求 ES。
- 与 [CQRS](../architecture/cqrs.md)：ES 通常在**写侧**使用，CQRS 在**读侧**另建投影。两者独立但常组合：命令改变状态 → 产生事件 → 事件驱动投影更新读模型。
- 与流式处理（stream processing / Kafka 式日志）：ES 是**领域状态溯源**，强调命令→事件→状态重建与版本演进；流式处理强调实时管道与跨服务消费。不要用"反正都是事件流"的心态混为一谈。

核心词汇：

- **命令（Command）**：表达"我想做某事"的意图（如 `OpenAccount`），可能失败或被拒绝。命令是动词式、可拒绝的。
- **事件（Event）**：表达"已经发生的事实"（如 `AccountOpened`），是不可变的、过去时的、只追加的。
- **聚合（Aggregate）**：命令的处理边界，保证一致性；事件归属于某个聚合实例（通过聚合 ID + 版本号）。

## 正确做法

### 1. 定义事件与聚合

事件是不可变的过去事实。聚合持有当前状态，并能从事件列表重建自己。

```csharp
// 事件：只含数据，不可变（record 天然不可变）
public abstract record AccountEvent(Guid AccountId, int Version);

public sealed record AccountOpened(Guid AccountId, int Version, string Owner, decimal OpeningBalance)
    : AccountEvent(AccountId, Version);

public sealed record MoneyDeposited(Guid AccountId, int Version, decimal Amount)
    : AccountEvent(AccountId, Version);

public sealed record MoneyWithdrawn(Guid AccountId, int Version, decimal Amount)
    : AccountEvent(AccountId, Version);

// 聚合：持有状态，可重放事件重建
public sealed class Account
{
    public Guid Id { get; private set; }
    public string Owner { get; private set; } = "";
    public decimal Balance { get; private set; }
    public int Version { get; private set; }

    public static Account Load(Guid id, IEnumerable<AccountEvent> events)
    {
        var account = new Account { Id = id };
        foreach (var e in events) account.Apply(e);
        return account;
    }

    // 命令：返回新事件（不抛异常，用结果表达拒绝）
    public Outcome<AccountEvent> Open(string owner, decimal openingBalance)
    {
        if (Version != 0) return Outcome<AccountEvent>.Fail("账户已存在");
        return Outcome<AccountEvent>.Ok(
            new AccountOpened(Id, Version + 1, owner, openingBalance));
    }

    public Outcome<AccountEvent> Deposit(decimal amount)
    {
        if (amount <= 0) return Outcome<AccountEvent>.Fail("金额必须为正");
        return Outcome<AccountEvent>.Ok(new MoneyDeposited(Id, Version + 1, amount));
    }

    public Outcome<AccountEvent> Withdraw(decimal amount)
    {
        if (amount <= 0) return Outcome<AccountEvent>.Fail("金额必须为正");
        if (Balance < amount) return Outcome<AccountEvent>.Fail("余额不足");
        return Outcome<AccountEvent>.Ok(new MoneyWithdrawn(Id, Version + 1, amount));
    }

    private void Apply(AccountEvent e) => Apply((dynamic)e);

    private void Apply(AccountOpened e) { Owner = e.Owner; Balance = e.OpeningBalance; Version = e.Version; }
    private void Apply(MoneyDeposited e) { Balance += e.Amount; Version = e.Version; }
    private void Apply(MoneyWithdrawn e) { Balance -= e.Amount; Version = e.Version; }
}

// 注意：这是「领域/命令层」的 Railway-Oriented 结果类型，与 POLICY P15 禁止的
// HTTP 层 `Outcome<T>` 信封（永远 200 + { success, data, error }）是两回事。
public readonly struct Outcome<T>
{
    public bool IsOk { get; }
    public T? Value { get; }
    public string? Error { get; }
    private Outcome(bool ok, T? value, string? error) => (IsOk, Value, Error) = (ok, value, error);
    public static Outcome<T> Ok(T v) => new(true, v, null);
    public static Outcome<T> Fail(string e) => new(false, default, e);
}
```

### 2. 只追加的事件存储（最小实现）

事件存储的契约：按聚合 ID 追加事件，**乐观并发控制**靠版本号（期望版本 == 已存最新版本）。

```csharp
public interface IEventStore
{
    Task<IReadOnlyList<AccountEvent>> LoadAsync(Guid accountId, CancellationToken ct = default);
    Task<AppendResult> AppendAsync(Guid accountId, int expectedVersion,
        IReadOnlyList<AccountEvent> events, CancellationToken ct = default);
}

public readonly record struct AppendResult(bool Success, int NewVersion, string? ConflictReason = null);

// 用内置内存字典演示；生产可用关系型表 (AccountId, Version, EventType, Payload JSON)
public sealed class InMemoryEventStore : IEventStore
{
    private sealed record Row(int Version, string EventType, string Payload);
    private readonly Dictionary<Guid, List<Row>> _streams = new();

    public Task<IReadOnlyList<AccountEvent>> LoadAsync(Guid id, CancellationToken ct = default)
    {
        var events = new List<AccountEvent>();
        if (_streams.TryGetValue(id, out var rows))
            foreach (var r in rows)
                events.Add(Deserialize(r.EventType, r.Payload, id, r.Version));
        return Task.FromResult((IReadOnlyList<AccountEvent>)events);
    }

    public Task<AppendResult> AppendAsync(Guid id, int expectedVersion,
        IReadOnlyList<AccountEvent> events, CancellationToken ct = default)
    {
        if (!_streams.TryGetValue(id, out var rows))
            rows = _streams[id] = new List<Row>();

        if (rows.Count != expectedVersion)            // 乐观并发：期待版本 == 当前长度
            return Task.FromResult(new AppendResult(false, rows.Count, "版本冲突：聚合已被并发修改"));

        foreach (var e in events)
        {
            rows.Add(new Row(e.Version, e.GetType().Name, Serialize(e)));
        }
        return Task.FromResult(new AppendResult(true, rows.Count));
    }

    // 序列化/反序列化用 System.Text.Json（见 Native AOT 小节）
    private static string Serialize(AccountEvent e) =>
        JsonSerializer.Serialize<AccountEvent>(e, JsonDefaults.Options);

    private static AccountEvent Deserialize(string type, string payload, Guid id, int version) =>
        type switch
        {
            nameof(AccountOpened)  => JsonSerializer.Deserialize<AccountOpened>(payload, JsonDefaults.Options)!,
            nameof(MoneyDeposited) => JsonSerializer.Deserialize<MoneyDeposited>(payload, JsonDefaults.Options)!,
            nameof(MoneyWithdrawn) => JsonSerializer.Deserialize<MoneyWithdrawn>(payload, JsonDefaults.Options)!,
            _ => throw new InvalidOperationException($"未知事件类型: {type}")
        };
}

internal static class JsonDefaults
{
    public static readonly JsonSerializerOptions Options = new(JsonSerializerDefaults.Web);
}
```

### 3. 命令处理 + 持久化 + 投影（写读分离）

命令计算出事件后，先追加到事件存储，再发布给投影（读模型）更新。

```csharp
public sealed class AccountService
{
    private readonly IEventStore _store;
    private readonly IProjection _projection;

    public AccountService(IEventStore store, IProjection projection)
        => (_store, _projection) = (store, projection);

    public async Task<Outcome<AppendResult>> HandleAsync(Command cmd)
    {
        var current = Account.Load(cmd.AccountId, await _store.LoadAsync(cmd.AccountId));
        var result = cmd switch
        {
            Open c    => current.Open(c.Owner, c.OpeningBalance),
            Deposit c => current.Deposit(c.Amount),
            Withdraw c => current.Withdraw(c.Amount),
            _ => Outcome<AccountEvent>.Fail("未知命令")
        };
        if (!result.IsOk)
            return Outcome<AppendResult>.Fail(result.Error!);

        var events = new[] { result.Value! };
        var append = await _store.AppendAsync(cmd.AccountId, current.Version, events);
        if (!append.Success)
            return Outcome<AppendResult>.Fail(append.ConflictReason!);

        await _projection.ApplyAsync(events);   // 更新读模型（见下）
        return Outcome<AppendResult>.Ok(append);
    }
}

public abstract record Command(Guid AccountId);
public sealed record Open(Guid AccountId, string Owner, decimal OpeningBalance) : Command(AccountId);
public sealed record Deposit(Guid AccountId, decimal Amount) : Command(AccountId);
public sealed record Withdraw(Guid AccountId, decimal Amount) : Command(AccountId);
```

### 4. 投影 / 读模型（与写模型分离，呼应 [CQRS](../architecture/cqrs.md)）

投影订阅事件流，把事件折叠成一个为查询优化的扁平读模型。可以有多个投影。

```csharp
public interface IProjection
{
    Task ApplyAsync(IEnumerable<AccountEvent> events, CancellationToken ct = default);
    Task<AccountSummary?> GetAsync(Guid accountId, CancellationToken ct = default);
}

public sealed record AccountSummary(Guid Id, string Owner, decimal Balance, int Version);

public sealed class AccountSummaryProjection : IProjection
{
    private readonly Dictionary<Guid, AccountSummary> _view = new();

    public Task ApplyAsync(IEnumerable<AccountEvent> events, CancellationToken ct = default)
    {
        foreach (var e in events)
        {
            _view.TryGetValue(e.AccountId, out var s);
            s ??= new AccountSummary(e.AccountId, "", 0, 0);
            var (owner, balance) = e switch
            {
                AccountOpened o => (o.Owner, o.OpeningBalance),
                MoneyDeposited d => (s.Owner, s.Balance + d.Amount),
                MoneyWithdrawn w => (s.Owner, s.Balance - w.Amount),
                _ => (s.Owner, s.Balance)
            };
            _view[e.AccountId] = s with { Owner = owner, Balance = balance, Version = e.Version };
        }
        return Task.CompletedTask;
    }

    public Task<AccountSummary?> GetAsync(Guid id, CancellationToken ct = default)
        => Task.FromResult(_view.TryGetValue(id, out var s) ? s : null);
}
```

### 5. 幂等消费（应对至少一次投递）

事件可能被重复投递，投影必须幂等：用"事件全局序号 / 聚合版本"去重。

```csharp
public sealed class IdempotentProjection : IProjection
{
    private readonly HashSet<string> _seen = new();   // "AccountId:Version" 已处理标记
    private readonly Dictionary<Guid, AccountSummary> _view = new();

    public Task ApplyAsync(IEnumerable<AccountEvent> events, CancellationToken ct = default)
    {
        foreach (var e in events)
        {
            var key = $"{e.AccountId}:{e.Version}";
            if (!_seen.Add(key)) continue;            // 重复事件：跳过
            // ... 折叠逻辑同前
        }
        return Task.CompletedTask;
    }

    public Task<AccountSummary?> GetAsync(Guid id, CancellationToken ct = default)
        => Task.FromResult(_view.TryGetValue(id, out var s) ? s : null);
}
```

### 6. 快照（缩短重放）

当事件流很长时，重放成本高。定期写"快照"表示某版本之前的状态，重放时从最近快照开始。

```csharp
public sealed record AccountSnapshot(Guid AccountId, int Version, string Owner, decimal Balance);

public sealed class SnapshottingStore
{
    private readonly IEventStore _store;
    private readonly Dictionary<Guid, AccountSnapshot> _snaps = new();
    private const int SnapshotEvery = 50;

    public SnapshottingStore(IEventStore store) => _store = store;

    public async Task<Account> LoadWithSnapshotAsync(Guid id)
    {
        _snaps.TryGetValue(id, out var snap);
        var fromVersion = snap?.Version ?? 0;
        var events = (await _store.LoadAsync(id))
            .Where(e => e.Version > fromVersion)
            .ToList();

        var account = snap is null ? new Account { Id = id }
                                   : Account.FromSnapshot(snap);
        foreach (var e in events) account.ApplyExternal(e);   // 仅重放快照之后的事件
        return account;
    }

    public async Task SaveAsync(Guid id, Account account, IReadOnlyList<AccountEvent> newEvents)
    {
        var append = await _store.AppendAsync(id, account.Version - newEvents.Count, newEvents);
        if (!append.Success) throw new InvalidOperationException(append.ConflictReason);

        if (account.Version % SnapshotEvery == 0)     // 每 N 个版本存一次快照
            _snaps[id] = new AccountSnapshot(id, account.Version, account.Owner, account.Balance);
    }
}
```

### 7. 事件版本化 / 模式演进

事件一旦写入就不可改。需求变化时**新增事件类型**或给既有事件加可选字段，旧事件保持原样。

```csharp
// v1（已存在历史）
public sealed record MoneyDeposited(Guid AccountId, int Version, decimal Amount) : AccountEvent(AccountId, Version);

// v2（新增可选字段，旧事件无此字段反序列化时为 null）
public sealed record MoneyDepositedV2(Guid AccountId, int Version, decimal Amount, string? Currency = null)
    : AccountEvent(AccountId, Version);

// 反序列化时把两个版本折叠成统一内部表示
private static AccountEvent Deserialize(string type, string payload, Guid id, int v) => type switch
{
    nameof(MoneyDeposited)  => Map(JsonSerializer.Deserialize<MoneyDeposited>(payload, JsonDefaults.Options)!),
    nameof(MoneyDepositedV2)=> Map(JsonSerializer.Deserialize<MoneyDepositedV2>(payload, JsonDefaults.Options)!),
    _ => throw new InvalidOperationException($"未知事件类型: {type}")
};

// 统一到内部事件（投影/聚合只认这个）
private static AccountEvent Map(MoneyDeposited e) =>
    new MoneyDepositedV2(e.AccountId, e.Version, e.Amount);
private static AccountEvent Map(MoneyDepositedV2 e) => e;
```

演进规则小结：
- **加字段**：新事件加可空/有默认值的字段，旧事件反序列化后仍可处理。
- **改语义**：新增事件类型，不要改旧类型含义。
- **删字段**：勿物理删；新事件不再写该字段，投影忽略即可。
- **重命名类型**：保留旧名可反序列化，或维护一张"旧名→新类型"映射表。

## 常见误区

### 误区 1：把事件当"我现在要让别人做什么"来设计
❌ `DepositMoneyCommandEvent { AccountId, Amount }` —— 命名带 Command，且承载"意图/指令"，可能被消费者当作可调用的动作。
✅ 事件是过去时、不可变的事实：`MoneyDeposited { AccountId, Amount, Version }`。它描述"已发生"，不触发任何行为，只被投影/重放读取。
**WHY**：事件进入只追加日志后就不能改；若它是"指令"，重放时会被反复"执行"，造成重复副作用。命令与事件必须分离（见 [领域事件](../architecture/domain-events.md) 对事实的强调）。

### 误区 2：把 ES 当成消息总线 / 事件驱动架构来用
❌ 认为"用了事件流就天然是事件驱动系统，消费者跨服务随便订阅我的事件存储"。
✅ ES 首先解决**自身状态如何持久化**；跨服务通信是 [事件驱动](../architecture/event-driven.md) 的议题。若要发布给外部，应**显式地把事件再发布到独立的总线/出队表**，并区分领域事件与集成事件（integration event），不要把内部事件流直接暴露给外部消费者，也不要在重放历史时把旧事件重新广播出去。
**WHY**：重放历史事件会向外部发送"过去的事"，引发重复副作用；内部事件格式与版本演进节奏也不适合直接作为集成契约。

### 误区 3：忽略事件版本化，直接改已存在事件的字段
❌ 给 `MoneyDeposited` 直接加 `Currency` 字段并认为历史数据会自动兼容，或干脆改旧事件 JSON 结构。
✅ 新增 `MoneyDepositedV2` 或在反序列化层做版本折叠（见 §正确做法 7），旧事件原样保留。
**WHY**：事件不可变且可能跨年重放；修改已存事件会破坏历史一致性、使快照与重放结果不一致，是 ES 最痛的演进坑。

### 误区 4：假设读模型与写模型强一致（同步可用）
❌ 写入事件后立即在同一请求里查读模型，期望马上看到最新值。
✅ 投影更新是**异步/最终一致**的；如需强一致读，直接从事件流实时重放该聚合（写侧读取），不要依赖投影。
**WHY**：ES + [CQRS](../architecture/cqrs.md) 的核心收益就是读写分离，投影天然延迟。把最终一致当 bug 处理，会逼出反模式（同步投影、读写耦合）。

### 误区 5：认为"事件流可随时 DELETE 掉某条记录"
❌ 出于 GDPR / 用户注销，直接物理删除或改写事件流中的某条事件。
✅ 用"纠正事件"（如 `AccountErased`）追加一条语义，或对个人数据加密（密钥可销毁 = 加密擦除），或把 PII 存到独立的可删除存储、事件里只留引用 ID。
**WHY**：事件流只追加且是状态推导的唯一来源；物理删除会破坏重放结果与审计链，是 ES 的固有硬伤，必须在建模期就规划。

### 误区 6：每次都从头重放百万级事件，不做任何优化
❌ 读取聚合时永远 `Load(all events)`，导致延迟随历史线性增长。
✅ 引入快照（§正确做法 6）、或缓存已重建的聚合、或对冷数据归档。
**WHY**：重放成本是真实瓶颈；快照把复杂度从 O(N) 降到 O(N − 快照点)，是标配而非可选。

## 适用版本

事件溯源是**通用架构模式**，不绑定特定 .NET 版本，`introduced-in: general`。以下 .NET 能力可被直接用于实现 ES：

- `System.Text.Json`（源生成序列化）— 事件序列化首选，避免引入第三方 JSON 库。
- `record` 类型（C# 9+，.NET 5+）— 不可变事件建模的惯用法。
- `IAsyncEnumerable<T>`（.NET Core 3.0+）— 适合大数据流的事件流遍历。
- `Channel<T>`（System.Threading.Channels，.NET Core 3.0+）— 进程内事件发布/订阅与背压。
- 乐观并发可用任何关系型数据库的事务 + 版本列实现，无需特定版本特性。

### Native AOT 兼容性

Native AOT 会在编译期裁剪未直接引用的类型与反射元数据，ES 的两大惯用法会踩坑：

1. **按名反序列化（`Type.GetType("MoneyDeposited")` + `JsonSerializer.Deserialize(obj, type)`）**：AOT 下类型可能被裁剪或缺失反射元数据，运行期找不到类型。
   - ✅ 改用**封闭事件集 + 类型判别器（discriminator）**的 `switch` 映射（如上面 `Deserialize(string type, ...)` 的 `nameof` 分支），在编译期穷举所有事件类型，完全不依赖 `Type.GetType`。
2. **`System.Text.Json` 运行时反射**：AOT 默认不支持运行时反射反序列化。
   - ✅ 使用 **`[JsonSerializable]` 源生成**（`JsonSerializerContext`）为事件层次生成序列化代码，而不是让运行时反射。给 `JsonSerializerOptions` 指定 `TypeInfoResolver` 为你的上下文。
   - 若事件是继承层次（基类 `AccountEvent`），在 context 上用 `[JsonDerivedType]` 标注每个子类型及其判别器名，让源生成器输出可读的 `type` 字段。
3. **`dynamic` 分派（`Apply((dynamic)e)`）**：`dynamic` 依赖运行时绑定器，AOT 不支持。
   - ✅ 改为显式 `switch`/`Match` 分派（如 `e switch { AccountOpened o => ..., ... }`），或使用手写的"接受者模式"/判别式 `switch` 表达式。上面的投影代码已用 `switch` 而非 `dynamic` 演示。
4. **避免运行时编译的表达式树 / `Assembly.Load`** 来动态加载事件处理程序；处理器应在编译期静态注册。

原则：**让事件类型集合在编译期封闭可见**，序列化与分派全部走源生成 + 显式分支，AOT 即可零警告发布。

## 参考资料

- Microsoft — Event Sourcing pattern: <https://learn.microsoft.com/en-us/azure/architecture/patterns/event-sourcing>
- Microsoft — .NET Microservices Architecture (事件溯源与 CQRS 章节): <https://learn.microsoft.com/en-us/dotnet/architecture/microservices/>
- 关联页面：[CQRS](../architecture/cqrs.md)、[事件驱动](../architecture/event-driven.md)、[领域事件](../architecture/domain-events.md)、[DDD](../architecture/ddd.md)
