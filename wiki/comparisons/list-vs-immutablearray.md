---
title: List 与 ImmutableArray 对比
summary: List<T> 可变灵活、ImmutableArray<T> 不可变且零额外分配、缓存友好；按"数据会不会变"与线程安全取舍；附 AOT 说明。
tags: [comparison, list, immutablearray]
introduced-in: general
applies-to: [net8, net9, net10]
status: stable
source: https://learn.microsoft.com/dotnet/api/system.collections.immutable.immutablearray-1
updated: 2026-07-11
---

# List 与 ImmutableArray 对比

> **要点速览**
> - `List<T>` 可变；`ImmutableArray<T>` 不可变、隐式线程安全、缓存友好。
> - 集合会变用 List；定型后只读/跨线程/作 API 边界用 ImmutableArray。
> - 构建期用 `ImmutableArray.CreateBuilder<T>` 攒齐再冻结，避免逐次复制。
> - `default(ImmutableArray<T>)` 是未初始化态（访问抛异常），空集用 `.Empty`。

## 概述

`List<T>` 可变、动态扩容；`ImmutableArray<T>` 不可变、连续内存，任何"修改"都返回全新数组。二者没有谁碾压谁，关键看数据"活不活"。

## 取舍对比

| 维度 | List&lt;T&gt;（可变列表） | ImmutableArray&lt;T&gt;（不可变数组） |
|------|--------------------------|--------------------------------------|
| 可变性 | 可变，随时增删改 | 不可变，修改返回新实例 |
| 底层存储 | 动态数组，按需扩容 | 连续内存，单一不可变数组 |
| 分配开销 | 扩容时复制；单元素追加廉价 | 构建期一次；修改产生新副本 |
| 缓存友好 | 较好 | 极佳（连续内存、无头对象） |
| 线程安全 | 非线程安全，需外部锁 | 隐式线程安全（只读共享无需锁） |
| 默认值 | 可为 null | `default` 是**未初始化**态（访问抛异常），空集合用 `.Empty` |
| 接口 | `IList<T>`/`IEnumerable<T>` | `IReadOnlyList<T>`/`IEnumerable<T>` |
| 枚举 | 接口枚举有装箱风险 | 无装箱（struct 枚举器） |
| 适用 | 频繁变更、数量未知 | 构建一次、多次读取/共享 |

## 正确做法

### 1. 按"数据会不会变"选型

| 场景 | 用 |
|------|----|
| 生命周期内频繁增删改、规模未知 | `List<T>` |
| 构建一次、之后只读/跨线程/作 API 返回 | `ImmutableArray<T>` |
| 构建阶段要累积大量元素 | 先 `CreateBuilder<T>` 再冻结 |

### 2. 示例

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

`ImmutableArray<T>` 可 `AsSpan()` 零拷贝交给 `Span<T>` API（见 [Span 与内存安全](../dotnet/csharp/modern-csharp.md#span)），读多写少的热路径常能压过 `List<T>`。

## 常见误区

❌ **在循环里对 `ImmutableArray<T>` 反复 `Add`**。每次都会复制整个数组，改得越频繁越灾难。构建期用 `CreateBuilder<T>` 攒齐再 `MoveToImmutable()`。

❌ **把 `default(ImmutableArray<T>)` 当空集**。它是未初始化态，访问即抛异常；空集合必须写 `ImmutableArray<T>.Empty`。

❌ **为"听起来高级"在一直变的集合上硬上 `ImmutableArray`**。`List<T>` 才是频繁变更场景该用的工具；不可变适合"定型后只读"。

❌ **以为 `ImmutableArray` 一定更快**。写多读少时，它的复制成本远高于 `List`；只有读多/共享/缓存敏感场景才占优。

## 适用版本

`ImmutableArray<T>` 随 `System.Collections.Immutable` 提供（.NET Core 起内置于框架）；`CreateBuilder`/`AsSpan` 通用。

### Native AOT 兼容性

两者都是 BCL 集合，**AOT 安全**（[AOT 矩阵](../dotnet/aot/aot-compatibility.md)）。注意：若集合作为 JSON 序列化目标，需 `System.Text.Json` **源生成**（见 [序列化](../dotnet/csharp/serialization.md)）；`ImmutableArray<T>` 本身无运行期反射依赖。

## 参考资料

- [record 与 class 对比](record-vs-class.md) · [Span 与内存安全](../dotnet/csharp/modern-csharp.md#span)
- [AOT 兼容性矩阵](../dotnet/aot/aot-compatibility.md) · [.NET 版本演进](net-evolution.md)
- 官方文档：[ImmutableArray&lt;T&gt;](https://learn.microsoft.com/dotnet/api/system.collections.immutable.immutablearray-1)
