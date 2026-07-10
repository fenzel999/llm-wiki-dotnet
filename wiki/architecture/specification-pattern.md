---
title: 规约模式（Specification）
summary: 把查询条件封装成可复用、可组合的对象，返回表达式树供 EF Core 翻译成 SQL；手写零依赖。
tags: [architecture, specification, ddd, ef-core, expression]
introduced-in: general
applies-to: [net8, net9, net10]
status: stable
source: https://learn.microsoft.com/dotnet/architecture/microservices/microservice-ddd-cqrs-patterns/infrastructure-persistence-layer-design
updated: 2026-07-10
---

# 规约模式

> **要点速览**
> - 把"什么样的实体符合条件"封装成可复用的 Specification 对象，业务语义集中一处。
> - 规约返回 **`Expression<Func<T,bool>>`**（不是 `Func`），才能被 EF Core 翻译成 SQL 下推数据库。
> - 用 And/Or/Not 组合小规约成复杂条件；手写基类即可，零第三方依赖。
> - 别返回 `Func`（会变客户端求值、把整表拉进内存）。

## 概述

同一套查询条件（"活跃的高价值客户"、"待发货的订单"）在代码里反复出现、各写各的 `Where`，既重复又容易写歪。**规约模式（Specification）**把这类"筛选规则"提炼成一个有名字、可复用、可组合的对象——业务语义集中表达一次，处处引用。它是 DDD 里的经典战术模式；我们用**手写基类 + EF Core 表达式树**实现，不引任何第三方包（[P10](../governance/policy.md)）。

关键约束：规约必须暴露 **`Expression<Func<T, bool>>`**（表达式树），而不是编译后的 `Func<T, bool>`。只有表达式树能被 EF Core 的 `IQueryable` 翻译成 SQL 在数据库端执行；给 `IQueryable.Where` 传 `Func` 会退化成客户端求值，把整张表拉进内存再过滤。

## 正确做法

手写一个极简规约基类，支持组合，直接用于 `IQueryable`：

```csharp
public abstract class Specification<T>
{
    public abstract Expression<Func<T, bool>> ToExpression();

    public Specification<T> And(Specification<T> other) => new AndSpec<T>(this, other);

    private sealed class AndSpec<TE>(Specification<TE> l, Specification<TE> r) : Specification<TE>
    {
        public override Expression<Func<TE, bool>> ToExpression()
        {
            var p = Expression.Parameter(typeof(TE));
            var body = Expression.AndAlso(
                Expression.Invoke(l.ToExpression(), p),
                Expression.Invoke(r.ToExpression(), p));
            return Expression.Lambda<Func<TE, bool>>(body, p);
        }
    }
}

public sealed class ActiveCustomer : Specification<Customer>
{
    public override Expression<Func<Customer, bool>> ToExpression() => c => c.IsActive;
}

// 用法：条件下推到数据库
var spec = new ActiveCustomer().And(new HighValueCustomer());
var list = await db.Customers.Where(spec.ToExpression()).ToListAsync();
```

## 常见误区

❌ 规约返回 `Func<T,bool>` 而非 `Expression<Func<T,bool>>`：EF Core 无法翻译成 SQL，退化为客户端求值，把整表拉进内存。始终用表达式树。

❌ 把复杂 `Where` 条件散落在各个查询里重复粘贴，规则一改到处漏。用规约集中表达、复用。

❌ 给简单一次性查询也套规约，徒增样板。规约用于**复用/组合**的业务条件，不是每个 `Where` 都要包。

## 适用版本

表达式树与 `IQueryable` 全版本通用；示例面向 EF Core（net8+）。

## 参考资料

- [领域驱动设计](ddd.md)
- [EF Core 查询性能](../dotnet/ef-core/query-performance.md)
- [LINQ 延迟执行](../dotnet/csharp/linq.md)
- 官方文档：[基础设施与持久层设计（规约模式）](https://learn.microsoft.com/dotnet/architecture/microservices/microservice-ddd-cqrs-patterns/infrastructure-persistence-layer-design)
