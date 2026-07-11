---
title: 值对象（Value Object）
summary: 无标识、按值相等、不可变的描述性概念；用 record / readonly record struct 免费获得值相等与不可变；构造即校验；EF Core 用 Complex Type / Owned 映射；AOT 友好。
tags: [architecture, ddd, value-object, record, immutability]
introduced-in: general
applies-to: [net8, net9, net10]
status: stable
source: https://learn.microsoft.com/dotnet/architecture/microservices/microservice-ddd-cqrs-patterns/implement-value-objects
updated: 2026-07-11
---

# 值对象（Value Object）

> **要点速览**
> - **值对象**描述领域的一个方面，**无概念标识**：所有属性值相等即相等（对比[实体](entities.md)按 Id 相等）。
> - **首选 `record` / `readonly record struct`**：免费获得**值相等 + 不可变**，无需手写 `Equals`/`GetHashCode`（[P1](../governance/policy.md)、[record vs class](../comparisons/record-vs-class.md)）。
> - **不可变**：属性只 `init`/无 setter；"修改"即返回新实例（`with`）。
> - **构造即校验**：非法值在构造函数就抛异常，保证值对象永远合法。
> - 把散落在实体上的相关属性（`Street`+`City`+`Zip`）**聚成一个值对象**（`Address`），让模型更贴业务。
> - **别给值对象加 Id**；EF Core 用 **Complex Type（net8+）** 或 **Owned Type** 映射到宿主表列。

## 概述

值对象是 DDD 战术积木之一（见 [DDD 总览](ddd.md)），与[实体](entities.md)相对：

| | 实体 Entity | 值对象 Value Object |
|---|-------------|---------------------|
| 身份 | 由 **Id** 定义 | 无 Id，由**属性值**定义 |
| 相等 | Id 相同即同一个 | 所有属性相等即相等 |
| 可变性 | 生命周期内可变 | **不可变**（改则换新值） |
| 典型例子 | `Order`、`Customer` | `Money`、`Address`、`DateRange`、`Email` |

值对象的意义：把"是否同一个"用**值**而非标识来判断（两个 `Money(10,"CNY")` 就是相等的钱），并将一组共同表达一个**完整概念**的字段收拢，降低实体复杂度。

## 正确做法

### 1. 首选 record —— 免费的值相等与不可变

```csharp
// 小而无引用类型内部字段：用 readonly record struct（栈上、零分配）
public readonly record struct Money(decimal Amount, string Currency)
{
    public Money Add(Money other)
    {
        if (Currency != other.Currency)
            throw new InvalidOperationException("币种不同不能相加");
        return this with { Amount = Amount + other.Amount };   // 返回新值，不改自身
    }
}

// 含多个字段的描述性概念：用 record（class 语义）
public sealed record Address(string Street, string City, string ZipCode);
```

`record` 自动实现按**所有成员**的值相等、`GetHashCode`、`ToString` 与 `with` 复制。这正是值对象要的语义，**无需**手写 `GetAtomicValues()`/`Equals` 那套样板。

### 2. 构造即校验，保证永远合法

不可变 + 构造校验 = 值对象一旦存在就一定合法：

```csharp
public sealed record Email
{
    public string Value { get; }
    public Email(string value)
    {
        if (string.IsNullOrWhiteSpace(value) || !value.Contains('@'))
            throw new ArgumentException("非法邮箱", nameof(value));
        Value = value.Trim().ToLowerInvariant();
    }
    public override string ToString() => Value;
}
```

> 需要额外校验/规范化时用带主体的 `record`（如上）；纯数据用位置 `record`（如 `Address`）。

### 3. 把散落属性提炼成值对象

```csharp
// ❌ 之前：地址三个字段散落在实体上
public class Customer : Entity<Guid>
{
    public string Street { get; set; }
    public string City { get; set; }
    public string ZipCode { get; set; }
}

// ✅ 之后：聚成一个值对象，实体更清爽、概念更清晰
public class Customer : Entity<Guid>
{
    public Address Address { get; private set; } = null!;
}
```

### 4. 何时需要一个"手写基类"？

用 `record` 就够时**不要**再造 `ValueObject` 基类。仅当值对象需要**忽略部分成员**参与相等、或统一封装比较逻辑，才手写一个极简基类：

```csharp
public abstract class ValueObject
{
    protected abstract IEnumerable<object?> GetEqualityComponents();
    public override bool Equals(object? obj) =>
        obj is ValueObject vo && GetType() == vo.GetType()
        && GetEqualityComponents().SequenceEqual(vo.GetEqualityComponents());
    public override int GetHashCode() =>
        GetEqualityComponents().Aggregate(0, (h, c) => HashCode.Combine(h, c));
}
```

绝大多数场景 `record` 更优（[P1](../governance/policy.md)）；此基类仅作兜底。

### 5. EF Core 持久化：Complex Type / Owned Type

值对象没有自己的表，映射到**宿主实体的列**：

- **Complex Type（net8+，推荐）**：`modelBuilder.Entity<Customer>().ComplexProperty(c => c.Address);` —— 值语义、不需要 key、支持结构共享。
- **Owned Type**：`OwnsOne(c => c.Address)` —— 较早方案，仍可用。

详见[建模关系](../dotnet/ef-core/modeling-relationships.md)。

### 决策表：实体还是值对象？

| 问题 | 是 → 实体 | 是 → 值对象 |
|------|-----------|-------------|
| 需要区分"两个属性相同但仍是不同的东西"吗？ | ✅ | |
| 需要独立追踪其生命周期/变更历史吗？ | ✅ | |
| 只关心"值是什么"、相同值即可互换吗？ | | ✅ |
| 天然不可变（金额、坐标、日期区间）吗？ | | ✅ |

## 常见误区

❌ **给值对象加 Id**。**为什么错**：一旦有 Id 就成了实体，破坏"按值相等、可互换"的语义。值对象无标识。

❌ **可变值对象**（公共 setter）。**为什么错**：值被共享引用时，改一处会意外影响他处；且破坏字典键/集合去重。用 `init`/无 setter，改则 `with` 返回新值。

❌ **用普通 `class` 又不重写相等**。**为什么错**：退化成引用相等，两个内容相同的值对象被判为不等。用 `record`（或值对象基类）拿到值相等。

❌ **过度值对象化**（把每个 `string` 都包一层）。**为什么错**：徒增类型与样板。只为**表达完整业务概念**（`Money`/`Address`/`Email`）而建，不为包装而包装。

❌ **在值对象里放业务编排/依赖注入**。**为什么错**：值对象是纯数据 + 自身不变量；跨对象逻辑属[领域服务](domain-application-services.md)。

## 适用版本

`record`（C# 9+）、`readonly record struct`（C# 10+）、`with` 表达式让值对象实现极简。EF Core **Complex Type** 需 **net8+**（[.NET 8](../dotnet/versions/net8.md)）；Owned Type 全版本可用。示例面向 net8+。

### Native AOT 兼容性

值对象是普通 C#/`record`，**完全兼容 AOT**（✅，[P16](../governance/policy.md)、[AOT 矩阵](../dotnet/aot/aot-compatibility.md)）：值相等由编译器生成、无运行期反射。经 API 传输时随宿主 [DTO](dto.md) 用 `System.Text.Json` **源生成**序列化（见 [序列化](../dotnet/csharp/serialization.md)）。

## 参考资料

- [领域驱动设计（总览）](ddd.md) · [实体与聚合根](entities.md) · [领域服务与应用服务](domain-application-services.md) · [record vs class](../comparisons/record-vs-class.md)
- [EF Core 建模关系（Complex/Owned Type）](../dotnet/ef-core/modeling-relationships.md) · [AOT 兼容性矩阵](../dotnet/aot/aot-compatibility.md)
- 官方文档：[实现值对象](https://learn.microsoft.com/dotnet/architecture/microservices/microservice-ddd-cqrs-patterns/implement-value-objects) · [EF Core 复杂类型](https://learn.microsoft.com/ef/core/modeling/complex-types) · [EF Core 拥有实体类型](https://learn.microsoft.com/ef/core/modeling/owned-entities)
