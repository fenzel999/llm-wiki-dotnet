---
title: List 与 ImmutableArray 对比
summary: List<T> 可变灵活、ImmutableArray<T> 不可变且零额外分配、缓存友好；按线程安全与性能取舍。
tags: [comparison, list, immutablearray, 集合, 性能, 线程安全]
introduced-in: general
applies-to: [all]
status: stable
source: https://learn.microsoft.com/dotnet/api/system.collections.immutable.immutablearray-1
updated: 2026-07-10
---

## 概述

`List<T>` 与 `ImmutableArray<T>` 都是顺序集合，但设计取向相反：`List<T>` 是可变（mutable）的动态数组，适合在生命周期内频繁增删改；`ImmutableArray<T>` 是不可变（immutable）的连续内存数组，一旦创建便不可更改，任何“修改”都会返回一个新实例。前者胜在灵活、写操作廉价；后者胜在零堆包装、缓存局部性极佳、且天然线程安全——多个线程可只读共享同一份数据而无需加锁。选型的核心矛盾是“可变带来的便利性”与“不可变带来的安全性 / 性能”，下文按维度展开。

## 取舍对比

| 维度 | List&lt;T&gt;（可变列表） | ImmutableArray&lt;T&gt;（不可变数组） |
|------|--------------------------|--------------------------------------|
| 可变性 | 可变(mutable)，可随时增删改 | 不可变(immutable)，修改返回新实例 |
| 底层存储 | 动态数组，按需扩容 | 连续内存，单一不可变数组 |
| 分配开销 | 扩容时复制；单元素追加廉价 | 构建期分配一次；修改产生新数组副本 |
| 缓存友好 | 较好 | 极佳（连续内存、无装箱/头对象） |
| 线程安全 | 非线程安全，需外部锁 | 隐式线程安全（只读共享无需锁） |
| 空值 | 不可为 null（实例层面） | 允许默认 `default` 表示空，无堆包装 |
| 接口 | 实现 `IList<T>`/`IEnumerable<T>` | 实现 `IReadOnlyList<T>`/`IEnumerable<T>` |
| 枚举 | 装箱风险（foreach 接口） | 无装箱，结构体枚举器 |
| 适用规模 | 频繁变更、数量未知 | 构建一次、多次读取/共享 |

**何时用 List&lt;T&gt;**

- 集合在生命周期内频繁增删改、规模动态变化、单线程或已有同步机制。
- 需要 `IList<T>` 语义、随机位置插入删除等可变操作。

**何时用 ImmutableArray&lt;T&gt;**

- 数据构建一次、之后只读，且需在多线程间安全共享，避免外部篡改（例如作为 API 边界的返回值）。
- 追求零分配与缓存局部性：连续内存、无头对象、无枚举装箱。
- 注意：若频繁“改一点点”，每次修改都会复制整个数组，反而拖慢。此时应先通过 `ImmutableArray.CreateBuilder<T>` 累积，再一次性冻结为不可变数组。

```csharp
using System.Collections.Immutable;

// List<T>：可变、灵活
var list = new List<int> { 1, 2 };
list.Add(3);
list[0] = 10;

// ImmutableArray<T>：不可变、线程安全共享
ImmutableArray<int> arr = ImmutableArray.Create(1, 2, 3);
ImmutableArray<int> arr2 = arr.Add(4);   // 返回新实例，arr 不变
Console.WriteLine(arr.Length);           // 3
Console.WriteLine(arr2.Length);          // 4

// 构建期用 Builder 累积，避免逐次复制
var builder = ImmutableArray.CreateBuilder<int>();
for (int i = 0; i < 1000; i++) builder.Add(i);
ImmutableArray<int> frozen = builder.MoveToImmutable();
```

## 结论与建议

默认按“数据是否会变”来选：会频繁变的用 `List<T>`；构建后只读、或要跨线程/跨边界共享的用 `ImmutableArray<T>`。如果你的场景是“先攒一大堆再定型”，用 `ImmutableArray.CreateBuilder<T>` 在构建阶段累积、最后冻结，既拿到不可变性又不付出逐次复制的代价。在性能敏感且只读的热路径上，`ImmutableArray<T>` 的缓存局部性与无装箱枚举通常明显优于 `List<T>`。

## 参考资料

- 相关：[record 与 class 对比](record-vs-class.md)
- 相关：[Span 与内存安全](../concepts/modern-csharp.md#span)
- 相关：[.NET 版本演进](net-evolution.md)
- 官方文档：[ImmutableArray&lt;T&gt;](https://learn.microsoft.com/dotnet/api/system.collections.immutable.immutablearray-1)
