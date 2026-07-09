---
title: 空处理规范
summary: 启用 NRT，用 ThrowIfNull 守卫，避免 null 作为合法返回值，返回空集合而非 null。
tags: [standard, null]
introduced-in: general
applies-to: [all]
status: stable
source: https://learn.microsoft.com/dotnet/csharp/nullable-references
updated: 2026-07-10
---

## 概述

空处理规范的目标是系统性地消灭 `NullReferenceException`，办法是把 null 检查前移到编译期、并在边界处做出明确的非空承诺。当可空引用类型（NRT）被启用、公共入口都被守卫、且集合永远不为 null 时，调用方无需处处判空即可安全使用返回值。这套约定让 API 更易用也更健壮，也把“未找到”与“空结果”在语义上清晰区分开来。

## 正确做法

首先应在项目中启用 Nullable Reference Types（NRT），让编译器在编译期警告可能的 `null` 解引用。公共 API 入口用 `ArgumentNullException.ThrowIfNull(arg)` 守卫参数，一旦为空立即失败，避免无效 `null` 在系统内部传播。不要把 `null` 当作“未找到/空”的合法返回值——未找到应抛具体异常，或在最小 API 中返回 `Results.NotFound()`。返回集合时一律返回空集合（如 `Array.Empty<T>()` 或 `ImmutableArray<T>.Empty`）而非 `null`。属性或字段若非必要不要声明为可空（`string?`），要明确区分“有值”与“无值”两种状态。

下面的 `GetUser` 在入口守卫空参数，未命中时抛具体异常并返回非 null 保证；`GetOrders` 则在无结果时返回 `Array.Empty<Order>()`，调用方无需判空即可遍历：

```csharp
#nullable enable

public User GetUser(UserId id)
{
    ArgumentNullException.ThrowIfNull(id);

    if (!_store.TryGetValue(id, out var user))
        throw new UserNotFoundException(id);

    return user; // 返回非 null 保证
}

public IReadOnlyList<Order> GetOrders(UserId id)
    => _store.TryGetOrders(id, out var orders)
        ? orders
        : Array.Empty<Order>(); // 空集合而非 null
```

## 反例（常见错误）

❌ 以下三类错误分别展示了用 `null` 表示未找到、返回 null 集合、以及不守卫就直接解引用：

```csharp
// 错误1：返回 null 表示未找到，调用方易 NRE
public User? GetUser(UserId id)
    => _store.TryGetValue(id, out var u) ? u : null;

// 错误2：返回 null 集合
public List<Order> GetOrders() => _empty ? null : _orders;

// 错误3：不守卫直接解引用
public void Print(UserId id) => Console.WriteLine(id.Value); // id 可能为 null
```

其他常见错误：

- 把 `null` 与“空”混为一谈，导致调用方在 `foreach` 上抛出 `NullReferenceException`。
- 在 NRT 启用后仍大量使用 `!` 强制解引用，掩盖而非消除真实的空风险。
- 对外暴露 `string?` 但文档未说明何时为 null，调用方被迫猜测。

## 适用版本

这些规范通用，本节省略（不写任何版本选项卡）。

## 参考资料

- 相关：[可空引用类型概念](../concepts/nullable-reference-types.md)
- 相关：[异常处理](../standards/exception-handling.md)
- 相关：[类型化返回](../patterns/minimal-api-organization.md)
- 官方文档：[Nullable reference types](https://learn.microsoft.com/dotnet/csharp/nullable-references)
