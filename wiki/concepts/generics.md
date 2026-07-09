---
title: 泛型（Generics）与约束
summary: 使用类型参数与 where 约束编写类型安全且高性能的复用代码，理解协变/逆变。
tags: [generics, 泛型, 约束, 协变]
introduced-in: csharp2
applies-to: [all]
status: stable
source: https://learn.microsoft.com/dotnet/csharp/fundamentals/types/generics
updated: 2026-07-10
---

## 概述

泛型（generics）通过类型参数（type parameter）在编译期保留类型信息，既实现了代码复用，又避免了 `object` 带来的装箱拆箱与类型转换异常，因此兼具类型安全与运行性能。约束（constraints）用 `where` 子句限制类型参数可接受的类别，例如 `where T : class, new()` 表示 T 必须是引用类型且拥有无参构造函数。协变（covariance，用 `out`）与逆变（contravariance，用 `in`）则让接口与委托在“更宽/更窄”的具体类型之间保持赋值兼容，是 LINQ 与函数式风格代码的基础。

## 正确做法

用 `where` 约束表达类型参数必须具备的能力，并在合适的地方利用协变让泛型集合更灵活。下面先定义一个要求 `T` 可比较的泛型方法，再用 `where T : class, new()` 约束一个通用存储类，最后展示 `IEnumerable<out T>` 的协变：字符串序列可以直接当作对象序列使用。

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

## 反例（常见错误）

❌ 退回使用 `object` 来“泛型化”，会引入装箱并丢失编译期类型检查，一旦类型不符就在运行时抛异常：

```csharp
❌ object boxed = 123;
int x = (int)boxed; // 装箱/拆箱；若实际类型不符会抛 InvalidCastException
```

- 约束写得过严会限制复用，过松又无法调用成员，需要权衡接口的抽象层级。
- 在值类型泛型上频繁装箱时，应考虑针对值类型特化或借助 [Span](../concepts/span-memory.md) 等零拷贝手段。
- 混淆 `out`（协变，生产者）与 `in`（逆变，消费者）的方向，会直接导致编译错误。

## 适用版本

所有受支持版本通用，无差异。

## 参考资料

- [可空引用类型](../concepts/nullable-reference-types.md)
- [依赖注入](../concepts/dependency-injection.md)
- 官方文档：[C# 泛型](https://learn.microsoft.com/dotnet/csharp/fundamentals/types/generics)
