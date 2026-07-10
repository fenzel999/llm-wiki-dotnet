---
title: 规约模式（Specification）
summary: 模块内部——DDD 战术模式，把查询条件封装成可复用可组合的对象，返回表达式树供 EF Core 翻译 SQL；手写零依赖；AOT 友好。
tags: [architecture, specification, ddd, ef-core, expression]
introduced-in: general
applies-to: [net8, net9, net10]
status: stable
source: https://learn.microsoft.com/dotnet/architecture/microservices/microservice-ddd-cqrs-patterns/infrastructure-persistence-layer-design
updated: 2026-07-11
---

# 规约模式（Specification）

> **要点速览**
> - **定位**：规约是**模块内部（Module-Internal）**的 DDD 战术模式（见[三种架构不在同一层级](solution-structure.md#arch-levels)），与聚合/值对象同级。
> - 把"什么样的实体符合条件"封装成可复用的 Specification 对象，**业务语义集中一处**。
> - 规约返回 **`Expression<Func<T,bool>>`**（不是 `Func`），才能被 EF Core 翻译成 SQL 下推数据库。
> - 用 And/Or/Not 组合小规约成复杂条件；手写基类即可，零第三方（[P10](../governance/policy.md)）。
> - 别返回 `Func`（会退化成客户端求值，整表拉进内存）。

## 概述

同一套查询条件（"活跃的高价值客户"、"待发货的订单"）在代码里反复出现、各写各的 `Where`，既重复又容易写歪。**规约模式（Specification）**把这类"筛选规则"提炼成一个**有名字、可复用、可组合**的对象——业务语义集中表达一次，处处引用。我们用**手写基类 + EF Core 表达式树**实现，不引任何第三方包。

关键约束：规约必须暴露 **`Expression<Func<T, bool>>`**（表达式树），而不是编译后的 `Func<T, bool>`。只有表达式树能被 `IQueryable` 翻译成 SQL 在数据库端执行；给 `IQueryable.Where` 传 `Func` 会退化成客户端求值。

## 正确做法

### 1. 极简规约基类 + 组合

```csharp
public abstract class Specification<T>
{
    public abstract Expression<Func<T, bool>> ToExpression();

    public Specification<T> And(Specification<T> other) => new AndSpec<T>(this, other);
    public Specification<T> Or(Specification<T> other)  => new OrSpec<T>(this, other);
    public Specification<T> Not()                       => new NotSpec<T>(this);

    private sealed class AndSpec<TE>(Specification<TE> l, Specification<TE> r) : Specification<TE>
    {
        public override Expression<Func<TE, bool>> ToExpression()
        {
            var p = Expression.Parameter(typeof(TE));
            var body = Expression.AndAlso(Expression.Invoke(l.ToExpression(), p), Expression.Invoke(r.ToExpression(), p));
            return Expression.Lambda<Func<TE, bool>>(body, p);
        }
    }
    // OrSpec / NotSpec 同理（Expression.OrElse / Expression.Not）
}

public sealed class ActiveCustomer : Specification<Customer>
{
    public override Expression<Func<Customer, bool>> ToExpression() => c => c.IsActive;
}

// 组合小规约成复杂条件，条件仍下推到数据库
var spec = new ActiveCustomer().And(new HighValueCustomer()).Not();
var list = await db.Customers.Where(spec.ToExpression()).ToListAsync();
```

### 2. 何时用规约？决策表

| 场景 | 用规约？ | 理由 |
|------|----------|------|
| 某条件在多处复用（活跃高价值客户） | ✅ | 语义集中、改一处 |
| 需要 And/Or/Not 动态组合查询 | ✅ | 组合优于拼接字符串 |
| 一次性、不复用的临时筛选 | ❌ | 直接 `Where` 更轻 |
| 纯内存集合过滤（`IEnumerable`） | ❌ | 用 `Func` 即可，无需表达式树 |

## 常见误区

❌ **规约返回 `Func<T,bool>` 而非 `Expression<Func<T,bool>>`**：EF Core 无法翻译成 SQL，退化为客户端求值，整表拉进内存。始终用表达式树。

❌ **把复杂 `Where` 散落各处重复粘贴**，规则一改到处漏。用规约集中表达、复用。

❌ **给简单一次性查询也套规约**，徒增样板。规约用于**复用/组合**的业务条件，不是每个 `Where` 都要包。

❌ **在规约里塞排序/分页**。规约只表达"筛选"（where）；排序/分页用 [分页扩展](../dotnet/ef-core/pagination.md) 单独处理，保持单一职责。

## 适用版本

表达式树与 `IQueryable` 全版本通用；示例面向 EF Core（net8+）。

### Native AOT 兼容性

规约产生的 `Expression` 在 AOT 下**安全**：它被 EF Core 的查询管道编译为 SQL，不经过 `System.Reflection.Emit` 生成运行期代码。规约类是普通 C#、无反射，AOT 友好（[P16](../governance/policy.md)、[AOT 矩阵](../dotnet/aot/aot-compatibility.md)）。注意最终查询结果若跨进程返回，DTO 序列化走 `System.Text.Json` **源生成**（见 [序列化](../dotnet/csharp/serialization.md)）。

## 参考资料

- [领域驱动设计（战术模式同级）](ddd.md) · [EF Core 查询性能](../dotnet/ef-core/query-performance.md) · [LINQ 延迟执行](../dotnet/csharp/linq.md)
- [AOT 兼容性矩阵](../dotnet/aot/aot-compatibility.md)
- 官方文档：[基础设施与持久层设计（规约模式）](https://learn.microsoft.com/dotnet/architecture/microservices/microservice-ddd-cqrs-patterns/infrastructure-persistence-layer-design)
