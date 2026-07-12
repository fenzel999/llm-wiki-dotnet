---
title: 实体与聚合根（Entity / Aggregate Root）
summary: 实体按标识相等；聚合根是一致性/事务边界，只经根方法修改、按 Id 引用其他聚合；主键用顺序 GUID（UUIDv7）；审计/软删除/乐观并发下沉基础设施；AOT 友好。
tags: [architecture, ddd, entity, aggregate, domain-model]
introduced-in: general
applies-to: [net8, net9, net10]
status: stable
source: https://learn.microsoft.com/dotnet/architecture/microservices/microservice-ddd-cqrs-patterns/net-core-microservice-domain-model
updated: 2026-07-11
---

# 实体与聚合根（Entity / Aggregate Root）

> **要点速览**
> - **实体（Entity）**：由**标识（Id）与生命周期**定义，而非属性——两个实体即使属性全同，只要 Id 不同就是不同对象。
> - **聚合（Aggregate）**：一组作为整体处理的领域对象；**聚合根**是唯一入口，负责自身与内部子实体的**不变量**。
> - **三条铁律**：① 外部只经聚合根方法改状态；② 聚合是**事务边界**（一次业务操作只改一个聚合）；③ 引用其他聚合**只用 Id**，不用导航属性。
> - **主键**：用**顺序 GUID**（.NET 9 `Guid.CreateVersion7()`，UUIDv7 时间有序）避免聚集索引碎片；**不要** `Guid.NewGuid()`。
> - **封装**：属性 `private/protected set`，集合以 `IReadOnlyList` 暴露；ORM 需要一个 `protected` 无参构造。
> - **审计/软删除/乐观并发**是横切能力，下沉到[基础设施](../dotnet/ef-core/ef-data-access.md)自动处理，别污染领域方法（见[审计与软删除](auditing-soft-delete.md)、[并发](../dotnet/ef-core/concurrency.md)）。

> **在体系中的位置**：第 3 步 · 领域建模（DDD 战术）。先读 [架构总览与决策指南](overview.md)；与 [值对象](value-objects.md) 互补（无标识描述用值对象）；状态变更发 [领域事件](domain-events.md)；审计字段/软删除见 [审计与软删除](auditing-soft-delete.md)。

## 概述

实体是 DDD 战术建模的核心积木（见 [DDD 总览](ddd.md)）。它的身份不来自属性值，而来自**标识**：同一个 `Order`，今天改了状态、明天加了行，仍是同一个订单。这与[值对象](value-objects.md)（无标识、按值相等）正相反。

**聚合**把强相关的实体聚成一个一致性单元。例如 `Order`（根）+ 若干 `OrderLine`（子实体）：外部代码只认识 `Order`，通过它的方法增删明细；`OrderLine` 不能脱离 `Order` 独立存在或被独立修改。聚合根守护整个聚合的**不变量**（如"已提交订单不能改行""总金额 = 各行之和"），并作为**事务边界**——一次 `SaveChanges` 提交一个聚合的完整变更。

## 正确做法

### 1. 标识与相等：按 Id + 类型比较

实体相等 = 类型相同且 Id 相同（未持久化的瞬态实体按引用相等）。抽一个领域基类统一处理：

```csharp
public abstract class Entity<TId>
    where TId : notnull
{
    public TId Id { get; protected init; } = default!;

    protected Entity() { }                       // 供 ORM 物化
    protected Entity(TId id) => Id = id;

    public override bool Equals(object? obj) =>
        obj is Entity<TId> other
        && GetType() == other.GetType()          // 子类型不同则不等
        && EqualityComparer<TId>.Default.Equals(Id, other.Id);

    public override int GetHashCode() => HashCode.Combine(GetType(), Id);
}
```

> 放在 `SharedKernel`（见[解决方案分层](solution-structure.md)）。不用第三方基类库，手写十几行即可（[P10](../governance/policy.md)）。

### 2. 主键：顺序 GUID（UUIDv7）优先

随机 `Guid.NewGuid()` 作聚集索引会导致**页分裂与碎片**，写入越多越慢。首选**时间有序**的 GUID：

=== "net9+（推荐）"

    ```csharp
    // UUIDv7：前缀为毫秒时间戳，天然递增，内置、AOT 安全
    var id = Guid.CreateVersion7();
    var order = Order.Create(id, customerId);
    ```

=== "net8（过渡）"

    ```csharp
    // 无内置 UUIDv7 时，让数据库生成顺序键（SQL Server: NEWSEQUENTIALID()），
    // 或用整型自增主键；避免在应用层用 Guid.NewGuid() 直接落聚集索引。
    ```

- 键类型选 `Guid`（分布式/合并友好）或 `int`/`long`（紧凑、可读）。团队统一即可。
- ORM 反序列化需要一个 `protected`/`private` 无参构造函数；业务构造函数负责强制最小不变量。

### 3. 聚合根：封装 + 只经根修改

```csharp
public sealed class Order : Entity<Guid>          // 聚合根
{
    private readonly List<OrderLine> _lines = [];
    public IReadOnlyList<OrderLine> Lines => _lines;         // 外部只读
    public Guid CustomerId { get; private set; }             // 引用其他聚合：只存 Id
    public OrderStatus Status { get; private set; }
    public decimal Total { get; private set; }               // 派生状态，由根维护

    private Order() { }                                       // 供 ORM

    public static Order Create(Guid id, Guid customerId) =>   // 工厂 + 不变量
        new() { Id = id, CustomerId = customerId, Status = OrderStatus.Draft };

    public void AddLine(string sku, int qty, decimal price)  // 业务规则守护
    {
        if (Status != OrderStatus.Draft)
            throw new InvalidOperationException("已提交的订单不能加行");
        _lines.Add(new OrderLine(Id, sku, qty, price));
        Total = _lines.Sum(l => l.Subtotal);                 // 维护派生状态
    }
}

public sealed class OrderLine : Entity<Guid>                  // 子实体
{
    internal OrderLine(Guid orderId, string sku, int qty, decimal price)  // 只给根用
    {
        Id = Guid.CreateVersion7();
        OrderId = orderId; Sku = sku; Qty = qty; Price = price;
    }
    private OrderLine() { }
    public Guid OrderId { get; private set; }
    public string Sku { get; private set; } = "";
    public int Qty { get; private set; }
    public decimal Price { get; private set; }
    public decimal Subtotal => Qty * Price;
}
```

要点：子实体构造函数设 `internal`，**强制**所有修改经聚合根方法，编译器帮你守边界。

### 4. 引用其他聚合：只用 Id，不用导航属性

```csharp
public Guid CustomerId { get; private set; }   // ✅ 跨聚合按 Id 引用
// public Customer Customer { get; set; }       // ❌ 别持有另一个聚合的对象引用
```

跨聚合导航会诱发大聚合、加载爆炸与事务边界模糊。需要客户信息时，由[应用服务](domain-application-services.md)分别取两个聚合再组合。

### 5. 审计 / 软删除 / 乐观并发：横切能力下沉

这些是**基础设施关注点**，不要写进领域方法：

| 能力 | 做法 | 详见 |
|------|------|------|
| 审计字段 | 实现 `IAuditedEntity` 接口（`CreatedAt`/`ModifiedAt`），用 EF Core **拦截器 / `SaveChanges` 重写**自动填充时间戳 | [审计与软删除](auditing-soft-delete.md) |
| 软删除 | 实现 `ISoftDelete { bool IsDeleted }`，配 EF Core **全局查询筛选器** 自动过滤 | [审计与软删除](auditing-soft-delete.md) |
| 乐观并发 | 加并发令牌（SQL Server `rowversion` / PostgreSQL `xmin`），冲突时抛 `DbUpdateConcurrencyException` | [并发控制](../dotnet/ef-core/concurrency.md) |

```csharp
// 标记接口（定义以 auditing-soft-delete.md 为准）：填充与过滤由 Infrastructure 统一做，领域不感知
public interface IAuditedEntity { DateTimeOffset CreatedAt { get; set; } DateTimeOffset? ModifiedAt { get; set; } }
public interface ISoftDelete { bool IsDeleted { get; set; } }
```

### 6. 复合键与"简单实体"

- **复合键**：无单一 Id 的实体（如多对多连接实体）在 EF Core 用 `modelBuilder.Entity<T>().HasKey(x => new { x.AId, x.BId })` 配置（见[建模关系](../dotnet/ef-core/modeling-relationships.md)）。
- **简单 CRUD 表**：没有跨实体不变量的普通数据表，别硬套聚合/工厂/领域服务——直接用 [`DbContext`](../dotnet/ef-core/ef-data-access.md)（[P11](../governance/policy.md) 克制）。

### 决策表：聚合根 / 子实体 / 简单实体

| 情况 | 建模为 |
|------|--------|
| 有独立生命周期、被外部直接引用、需守不变量 | **聚合根** |
| 依附于某聚合、不能独立存在、只经根修改 | **子实体** |
| 无跨实体规则的普通数据表 | 直接 `DbContext`，不需领域建模 |
| 无标识、按值相等的描述性概念 | [值对象](value-objects.md) |

## 常见误区

❌ **贫血模型**：实体只有公开 `get/set`，规则全在外部 Service。**为什么错**：失去封装与不变量保护，退化成"带字段的数据袋"。规则内聚到实体方法。

❌ **公共 setter / 暴露可变集合**：`public List<OrderLine> Lines { get; set; }` 让外部随意改。**为什么错**：绕过聚合根不变量。用 `private set` + `IReadOnlyList` + 根方法。

❌ **用 `Guid.NewGuid()` 作聚集索引主键**。**为什么错**：随机 GUID 导致索引页分裂与碎片，写入退化。用 `Guid.CreateVersion7()`（net9+）或数据库顺序键。

❌ **按导航属性引用其他聚合**（`Order.Customer`）。**为什么错**：撑大聚合、模糊事务边界、加载爆炸。跨聚合只存对方 Id。

❌ **独立修改子实体**（绕过根直接改 `OrderLine`）。**为什么错**：根无法维护派生状态与不变量。子实体构造/修改设 `internal`，只经根。

❌ **聚合设计过大**（把一堆实体塞进一个聚合）。**为什么错**：大事务、锁竞争。一次操作只改一个聚合；跨聚合最终一致用[领域事件](domain-events.md)。

❌ **用无类型的"动态扩展属性"字典代替强类型属性**。**为什么错**：丧失类型安全、难映射与重构。仅在扩展外部可复用模块时才考虑，自己的实体用强类型属性。

## 适用版本

建模方法与版本无关。`Guid.CreateVersion7()` 需 **net9+**（[.NET 9](../dotnet/versions/net9.md)）；集合表达式 `[]`、主构造函数需 net8+/C# 12+。EF Core 全局查询筛选器、`rowversion` 并发令牌全版本可用。

### Native AOT 兼容性

实体/聚合是普通 C#，**AOT 安全**（✅，[P16](../governance/policy.md)、[AOT 矩阵](../dotnet/aot/aot-compatibility.md)）：无运行期反射。`Guid.CreateVersion7()` 是内置方法，AOT 友好。注意：

- 实体经 API 返回时映射为 [DTO](dto.md)，JSON 走 `System.Text.Json` **源生成**（不要直接序列化实体，见 [DTO](dto.md)）。
- EF Core 在 AOT 发布下用**编译模型 / 预编译查询**；审计/软删除用拦截器与查询筛选器（编译期已知），AOT 安全。

## 在体系中的位置（何时引入）

- 当概念有**身份与生命周期**、需要一致性/事务边界时，建模为实体或聚合根；按标识相等，不经根不允许改内部。
- 聚合根是事务边界：跨聚合只经 Id 引用，不持有对象引用。

## 与其他模式的关系

- 与 [值对象](value-objects.md) 互补（无标识描述用值对象）；状态变更通过 [领域事件](domain-events.md) 通知。
- 审计字段/软删除见 [审计与软删除](auditing-soft-delete.md)；在 [整洁架构](clean-architecture.md)/[六边形架构](hexagonal-architecture.md) 领域核心内定义。
- 见 [DDD](ddd.md) 与 [架构总览与决策指南](overview.md) 学习路径第 4 步。

## 参考资料

- [领域驱动设计（总览）](ddd.md) · [值对象](value-objects.md) · [领域服务与应用服务](domain-application-services.md) · [数据传输对象 (DTO)](dto.md)
- [审计与软删除](auditing-soft-delete.md) · [EF Core 并发控制](../dotnet/ef-core/concurrency.md) · [建模关系](../dotnet/ef-core/modeling-relationships.md) · [EF 数据访问（DbContext 即 UoW）](../dotnet/ef-core/ef-data-access.md)
- 官方文档：[设计领域模型层](https://learn.microsoft.com/dotnet/architecture/microservices/microservice-ddd-cqrs-patterns/net-core-microservice-domain-model) · [领域模型基类与接口（Seedwork）](https://learn.microsoft.com/dotnet/architecture/microservices/microservice-ddd-cqrs-patterns/seedwork-domain-model-base-classes-interfaces) · [EF Core 全局查询筛选器](https://learn.microsoft.com/ef/core/querying/filters) · [EF Core 并发](https://learn.microsoft.com/ef/core/saving/concurrency)
