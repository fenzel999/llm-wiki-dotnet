---
title: 泛型(Generics)与约束
summary: 使用类型参数与 where 约束编写类型安全且高性能的复用代码，理解协变/逆变。
tags: [generics, 泛型, 约束, 协变]
introduced-in: general
applies-to: [all]
status: stable
source: sources/README.md
updated: 2026-07-09
---

## 概述

泛型(generics)通过类型参数(type parameter)实现编译期类型安全与代码复用，避免装箱并提升性能。约束(constraints)以 `where` 子句限制类型参数：如 `where T : class, new()`。协变(covariance, `out`)与逆变(contravariance, `in`)用于接口/委托的“宽窄”类型兼容。

## 正确做法

```csharp
public T Max<T>(T a, T b) where T : IComparable<T>
    => a.CompareTo(b) >= 0 ? a : b;

public class Store<T> where T : class, new()
{
    private readonly List<T> _items = new();
    public void Add(T item) => _items.Add(item);
}

// 协变：IEnumerable<out T>
IEnumerable<string> strings = new List<string>();
IEnumerable<object> objects = strings;
```

## 常见误区

- 用 `object` 而非泛型导致装箱与类型转换异常。
- 约束过严限制复用，或过松导致无法调用成员。
- 在值类型泛型上频繁装箱；考虑针对值类型特化或使用 [Span](../concepts/span-memory.md)。
- 混淆 `out`/`in` 方向造成编译错误。

## 参考资料

- [可空引用类型](../concepts/nullable-reference-types.md)
- [依赖注入](../concepts/dependency-injection.md)
