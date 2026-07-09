---
title: 空处理规范
summary: 启用 NRT，用 ThrowIfNull 守卫，避免 null 作为合法返回值，返回空集合而非 null。
tags: [standard, null]
introduced-in: general
applies-to: [all]
status: stable
source: https://learn.microsoft.com/dotnet/csharp/nullable-references
updated: 2026-07-09
---

## 规则

- 启用 **Nullable Reference Types（NRT）**（见 [可空引用类型概念](../concepts/nullable-reference-types.md)），让编译器在编译期发现可能的 `null` 解引用。
- 公共 API 入口用 `ArgumentNullException.ThrowIfNull(arg)` 守卫参数（见 [异常处理](../standards/exception-handling.md)）。
- 不要将 `null` 作为“未找到/空”的合法返回值；未找到应抛具体异常，或在最小 API 中返回 `Results.NotFound()`（见 [类型化返回](../patterns/minimal-api-organization.md)）。
- 返回集合时返回**空集合**（如 `Array.Empty<T>()`、`ImmutableArray<T>.Empty`）而非 `null`。
- 属性/字段若非必要不要声明为可空（`string?`）；明确区分“有值”与“无值”。

## 正确做法

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

## 反例

```csharp
// 错误1：返回 null 表示未找到，调用方易 NRE
public User? GetUser(UserId id)
    => _store.TryGetValue(id, out var u) ? u : null;

// 错误2：返回 null 集合
public List<Order> GetOrders() => _empty ? null : _orders;

// 错误3：不守卫直接解引用
public void Print(UserId id) => Console.WriteLine(id.Value); // id 可能为 null
```

## 理由

NRT 把 `null` 检查前移到编译期，消除一大类 `NullReferenceException`。`ThrowIfNull` 在边界快速失败，避免无效 `null` 在系统内部传播。空集合优于 `null`，让调用方无需额外判空即可 `foreach`。统一“非空返回值”约定使 API 更易用、更健壮。
