---
title: 领域驱动设计（DDD）
summary: 用聚合、实体、值对象、限界上下文把复杂业务建模成富领域模型，让代码贴合业务语言。
tags: [architecture, ddd, aggregate, value-object, bounded-context]
introduced-in: general
applies-to: [all]
status: stable
source: https://learn.microsoft.com/dotnet/architecture/microservices/microservice-ddd-cqrs-patterns/
updated: 2026-07-10
---

> **要点速览**
> - 积木：实体（有标识）、值对象（不可变、按值相等，用 `record`）、聚合（一致性边界，经聚合根对外）。
> - 战略：限界上下文划分子域，各有独立模型 + 统一语言。
> - 关键是**富领域模型**：业务规则内聚到领域对象方法，拒绝贫血模型。
> - 只用于复杂核心域；简单 CRUD 套全家桶是过度设计。

## 概述

领域驱动设计（Domain-Driven Design, DDD）是应对**复杂业务**的建模方法，核心是让代码和业务专家说同一种语言（统一语言 Ubiquitous Language）。它的战术积木有几个：**实体（Entity）**有唯一标识、生命周期内会变；**值对象（Value Object）**无标识、由值定义且不可变（如 `Money`、`Address`）；**聚合（Aggregate）**是一组绑在一起、有一致性边界的对象，由**聚合根（Aggregate Root）**统一对外，外部只能通过根来改动内部。战略层面用**限界上下文（Bounded Context）**划分不同子域，各自有独立模型。

关键在于**富领域模型**：业务规则写在领域对象的方法里，而不是散落在一堆贫血的 setter + 外部 Service 里。DDD 不是每个项目都需要——它是为复杂核心域准备的，简单 CRUD 用它反而是负担。

## 正确做法

聚合根封装不变量，只暴露有业务含义的方法；值对象不可变（用 `record`）：

```csharp
public record Money(decimal Amount, string Currency);   // 值对象：不可变、按值相等

public class Order                                        // 聚合根
{
    private readonly List<OrderLine> _lines = [];
    public IReadOnlyList<OrderLine> Lines => _lines;      // 外部只读
    public OrderStatus Status { get; private set; }

    public void AddLine(string sku, int qty)             // 业务规则在方法里
    {
        if (Status != OrderStatus.Draft)
            throw new InvalidOperationException("已提交的订单不能加行");
        _lines.Add(new OrderLine(sku, qty));
    }
}
```

## 常见误区

❌ 贫血模型：领域类只有一堆公开 getter/setter，业务规则全写在外部 Service 里。这只是"带字段的数据袋"，失去 DDD 的意义。规则应内聚到领域对象。

❌ 让外部代码绕过聚合根直接改内部集合（暴露可变 `List`）。内部集合用 `IReadOnlyList` 暴露，修改只经聚合根方法，守住不变量。

❌ 给简单 CRUD 硬套聚合/值对象/仓储/领域事件全家桶，过度设计。DDD 只用在复杂核心域。

## 适用版本

方法论与版本无关；`record`（net5+/C# 9）让值对象实现更简洁。

## 参考资料

- [整洁架构](clean-architecture.md)
- [CQRS](cqrs.md)
- [record vs class](../comparisons/record-vs-class.md)
- 官方文档：[DDD 与 CQRS 模式](https://learn.microsoft.com/dotnet/architecture/microservices/microservice-ddd-cqrs-patterns/)
