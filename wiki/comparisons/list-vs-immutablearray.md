---
title: List 与 ImmutableArray 对比
summary: List<T> 可变灵活、ImmutableArray<T> 不可变且零额外分配、缓存友好；按线程安全与性能取舍。
tags: [comparison, list, immutablearray, 集合, 性能, 线程安全]
introduced-in: general
applies-to: [all]
status: stable
source: sources/README.md
updated: 2026-07-09
---

## 对比维度

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

## 何时选哪个

- 选 **List&lt;T&gt;**：集合在生命周期内频繁增删改、规模动态变化、单线程或已有同步。
- 选 **ImmutableArray&lt;T&gt;**：构建后只读、需在多线程间安全共享、追求零分配与缓存局部性、作为 API 边界返回值避免外部篡改。
- 注意：频繁「改一点点」的 ImmutableArray 会产生大量数组副本，应先用 `ImmutableArray.CreateBuilder<T>` 累积再冻结。

## 代码示例

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

## 相关

- [record 与 class 对比](record-vs-class.md)
- [Span 与内存安全](../concepts/span-memory.md)
- [.NET 版本演进](net-evolution.md)
