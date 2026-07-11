---
title: 领域驱动设计（DDD）
summary: 模块内部的战术建模——聚合/实体/值对象/领域服务/限界上下文，富领域模型拒绝贫血；AOT 友好。
tags: [architecture, ddd, aggregate, value-object, bounded-context]
introduced-in: general
applies-to: [net8, net9, net10]
status: stable
source: https://learn.microsoft.com/dotnet/architecture/microservices/microservice-ddd-cqrs-patterns/
updated: 2026-07-11
---

# 领域驱动设计（DDD）

> **要点速览**
> - **定位**：DDD 是**模块内部（Module-Internal）**的战术建模方法，解决"领域对象怎么设计"，与拆不拆服务无关（见[三种架构不在同一层级](solution-structure.md#arch-levels)）。
> - **战术积木**：[实体（有标识）](entities.md)、[值对象（不可变、`record`、按值相等）](value-objects.md)、[聚合（一致性边界）](entities.md)、领域服务、领域事件。
> - **战略**：限界上下文划分子域，各自独立模型 + 统一语言（Ubiquitous Language）。
> - **灵魂**：**富领域模型**——业务规则内聚到领域对象的方法里，拒绝贫血模型。
> - **克制**：只用于**复杂核心域**；简单 CRUD 套全家桶是过度设计。

## 概述

领域驱动设计是应对**复杂业务**的建模方法，核心是让代码和业务专家说同一种语言（统一语言）。它分两层：

- **战略设计**：用**限界上下文（Bounded Context）**把大领域切成子域，每个上下文有自己独立、自洽的模型与边界。上下文之间用**防腐层（ACL）**或**共享内核（Shared Kernel）**对接（见 [解决方案分层](solution-structure.md)）。这正好对应一个**模块**。
- **战术设计**：上下文内部用一系列模式把概念落成代码——实体、值对象、聚合、领域服务、领域事件、规约。

DDD 不是每个项目都需要：它是为**复杂核心域**（计费、库存、排程等）准备的；简单增删改查用它反而是负担。

## 正确做法

### 1. 值对象（Value Object）：不可变、按值相等

```csharp
public readonly record struct Money(decimal Amount, string Currency)   // 值对象
{
    public Money Add(Money other)
    {
        if (Currency != other.Currency) throw new InvalidOperationException("币种不同不能相加");
        return new Money(Amount + other.Amount, Currency);
    }
}
```

用 `record`（或 `readonly record struct`）免费获得值相等与不可变；无标识、由属性定义"是不是同一个"。深入见[值对象](value-objects.md)。

### 2. 聚合（Aggregate）：一致性边界，只经根修改

```csharp
public class Order                                          // 聚合根
{
    private readonly List<OrderLine> _lines = [];
    public IReadOnlyList<OrderLine> Lines => _lines;        // 外部只读，防绕过
    public OrderStatus Status { get; private set; }

    public void AddLine(string sku, int qty)                // 不变量在方法里守护
    {
        if (Status != OrderStatus.Draft)
            throw new InvalidOperationException("已提交的订单不能加行");
        _lines.Add(new OrderLine(sku, qty));
    }
}
```

外部**只**通过聚合根的方法改状态；内部集合用 `IReadOnlyList` 暴露，防止绕过不变量。聚合是事务一致性边界——一次业务操作应落在一个聚合内。深入见[实体与聚合根](entities.md)。

### 3. 领域服务（Domain Service）：无状态、承载跨实体的业务

当某段逻辑不属于任何一个实体（跨多个聚合、或无状态计算）时，放进领域服务（区别于[应用服务](domain-application-services.md)——领域服务在 Domain 层、包含业务规则；应用服务在 Application 层、编排用例）。详见 [领域服务与应用服务](domain-application-services.md)。

### 4. 战略：限界上下文与模块一一对应

| 概念 | 落到代码 | 说明 |
|------|----------|------|
| 限界上下文 | 一个模块（[模块化单体](modular-monolith.md)） | 独立模型、独立 `DbContext`/schema |
| 统一语言 | 类名/方法名直接来自业务术语 | 如 `Order.Submit()` 而非 `orderService.update()` |
| 上下文映射 | 模块间契约（DTO + 应用服务） | 跨模块只依赖契约，不跨模块引用内层 |
| 防腐层 ACL | 模块入口的适配/映射 | 把外部模型翻译成本模块语言 |

## 常见误区

❌ **贫血模型**：领域类只有公开 getter/setter，业务规则全写在外部 Service 里——这只是"带字段的数据袋"，失去 DDD 意义。规则内聚到领域对象。

❌ **绕过聚合根直接改内部集合**（暴露可变 `List`/`DbSet` 随便改）。内部集合用 `IReadOnlyList` 暴露，修改只经聚合根方法，守住不变量。

❌ **给简单 CRUD 硬套聚合/值对象/仓储/领域事件全家桶**——过度设计。DDD 只用在复杂核心域；普通数据表直接 [EF 数据访问](../dotnet/ef-core/ef-data-access.md)。

❌ **聚合设计过大**（把一堆实体塞进一个聚合）导致锁竞争与超大事务。一个业务操作只改一个聚合；跨聚合一致性用[领域事件](domain-events.md)最终一致。

❌ **把 DDD 当"系统形态"**，以为用了它就等于微服务。DDD 是模块内部的建模方式，与拆服务正交。

## 适用版本

方法论与版本无关；`record`/`readonly record struct`（C# 9+）让值对象实现更简洁；示例面向 net8+。

### Native AOT 兼容性

DDD 领域模型**完全兼容 AOT**（✅，[P16](../governance/policy.md)、[AOT 矩阵](../dotnet/aot/aot-compatibility.md)）：实体/值对象/聚合都是普通 C#、无运行期反射。注意：

- 领域事件中若携带类型信息做反序列化，需 `System.Text.Json` **源生成**（见 [序列化](../dotnet/csharp/serialization.md)）。
- 跨聚合最终一致走[领域事件分发器](domain-events.md)（DI 解析，非反射），AOT 安全。

## 何时使用

- 领域有丰富且易变的业务规则、需要富领域模型（而非贫血 CRUD）时。
- 想用统一语言对齐业务与技术、降低"模型漂移"时。

## 与其他模式的关系

- 战术构件各自成页：[实体与聚合根](entities.md)、[值对象](value-objects.md)、[领域事件](domain-events.md)、[领域服务与应用服务](domain-application-services.md)、[DTO](dto.md)、[规约模式](specification-pattern.md)。
- 战略边界见 [限界上下文](bounded-context.md)；落在 [整洁架构](clean-architecture.md) / [六边形架构](hexagonal-architecture.md) 内部。
- 见 [架构总览与决策指南](overview.md) 学习路径第 4 步。

## 参考资料

- [整洁架构（模块内分层）](clean-architecture.md) · [模块化单体（限界上下文=模块）](modular-monolith.md)
- [实体与聚合根](entities.md) · [值对象](value-objects.md) · [领域服务与应用服务](domain-application-services.md) · [领域事件](domain-events.md) · [规约模式](specification-pattern.md)
- [record vs class](../comparisons/record-vs-class.md) · [AOT 兼容性矩阵](../dotnet/aot/aot-compatibility.md)
- 官方文档：[DDD 与 CQRS 模式](https://learn.microsoft.com/dotnet/architecture/microservices/microservice-ddd-cqrs-patterns/)
