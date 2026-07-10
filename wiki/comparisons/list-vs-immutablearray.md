---
title: List 与 ImmutableArray 对比
summary: List<T> 可变灵活、ImmutableArray<T> 不可变且零额外分配、缓存友好；按线程安全与性能取舍。
tags: [comparison, list, immutablearray]
introduced-in: general
applies-to: [all]
status: stable
source: https://learn.microsoft.com/dotnet/api/system.collections.immutable.immutablearray-1
updated: 2026-07-10
---

> **要点速览**
> - `List<T>` 可变；`ImmutableArray<T>` 不可变、隐式线程安全、缓存友好。
> - 集合会变用 List；定型后只读/跨线程/作 API 边界用 ImmutableArray。
> - `default(ImmutableArray<T>)` 是未初始化态（访问抛异常），空集用 `.Empty`。

## 概述

`List<T>` 和 `ImmutableArray<T>` 表面上看都是"一串东西"的容器，但骨子里是两种相反的价值观。前者是mutable（可变）的动态数组：你想加就加、想改就改，容量不够它就自己扩容，用起来特别随意。后者是不可变（immutable）的连续内存数组：一旦创建就锁死，任何所谓的"修改"都不会动原来的数据，而是返回一个全新的数组。

这俩没有谁碾压谁，关键看你手里的数据"活不活"。如果你的集合在生命周期里要不停增删改、规模也不确定，那 `List<T>` 的廉价写操作无可替代；反过来，如果数据是构建一次、之后只会被反复读取和共享，那 `ImmutableArray<T>` 的零额外分配、对 CPU 缓存友好的连续内存、以及"多个线程只读共享而不用加锁"的天然线程安全，会让你省下不少麻烦。下面我们把这两条路的取舍拆开讲清楚。

## 取舍对比

| 维度 | List&lt;T&gt;（可变列表） | ImmutableArray&lt;T&gt;（不可变数组） |
|------|--------------------------|--------------------------------------|
| 可变性 | 可变(mutable)，可随时增删改 | 不可变(immutable)，修改返回新实例 |
| 底层存储 | 动态数组，按需扩容 | 连续内存，单一不可变数组 |
| 分配开销 | 扩容时复制；单元素追加廉价 | 构建期分配一次；修改产生新数组副本 |
| 缓存友好 | 较好 | 极佳（连续内存、无装箱/头对象） |
| 线程安全 | 非线程安全，需外部锁 | 隐式线程安全（只读共享无需锁） |
| 空值/默认值 | 引用类型，变量可为 null | struct 不可为 null；但 `default(ImmutableArray<T>)` 是**未初始化**态（访问会抛异常），空集合须用 `ImmutableArray<T>.Empty` |
| 接口 | 实现 `IList<T>`/`IEnumerable<T>` | 实现 `IReadOnlyList<T>`/`IEnumerable<T>` |
| 枚举 | 装箱风险（foreach 接口） | 无装箱，结构体枚举器 |
| 适用规模 | 频繁变更、数量未知 | 构建一次、多次读取/共享 |

先说结论该选哪个：**如果你的集合在变，用 `List<T>`；如果它定型之后再也不会改、或者要在多线程之间传递、当作 API 的边界返回出去，用 `ImmutableArray<T>`。**

具体来说，`List<T>` 适合这些场景：集合在生命周期内频繁增删改、规模是运行时才能知道的、或者你本来就跑在单线程里（又或者已经有别的同步机制兜底）。它实现了 `IList<T>`，意味着你还能在任意位置插入、删除，这种可变语义是它在很多业务代码里仍然当仁不让的原因。

`ImmutableArray<T>` 则适合另一类数据：构建一次之后就是只读的，而且可能要被多个线程同时读。`ImmutableArray<T>` 不可变，所以你可以放心地把它丢给任何线程，根本不需要锁——这就是所谓的"隐式线程安全"。另外，因为它就是一块连续内存、没有装箱、连枚举器本身都是 struct（值类型），所以读起来对 CPU 缓存极其友好，枚举时也不会有装箱带来的额外分配。

不过有个坑要提醒：如果你"每次只想改一点点"，`ImmutableArray<T>` 每次都会把整个数组复制一份再返回新实例。改得越频繁，复制越要命。所以千万不要在循环里对 `ImmutableArray<T>` 反复调用 `Add`，那会变成性能灾难。正确的做法是先用 `ImmutableArray.CreateBuilder<T>` 这个可变的"草稿本"把数据攒齐，最后一次性冻结成不可变数组。这样既拿到不可变性，又不付逐次复制的代价。

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

选型的判断标准其实就一句话：**数据会不会变。** 会频繁变的，老老实实用 `List<T>`，别勉强自己；构建之后就定型、或者要跨线程、跨边界共享的，果断上 `ImmutableArray<T>`。

如果你的场景是"先攒一大堆数据，最后定型就不再动了"，那最舒服的姿势是用 `ImmutableArray.CreateBuilder<T>` 在构建阶段累积，等齐了再冻结。这样你既享受了不可变带来的安全与缓存友好，又避开了"每次改都复制一遍"的开销。

还有一点经验之谈：在那种"读多写少"、而且对延迟敏感的热路径上，`ImmutableArray<T>` 的连续内存布局和无装箱枚举，通常能明显压过 `List<T>` 一筹。但要是你的集合生命周期里一直在动，那就别为了"听起来高级"硬上不可变——`List<T>` 才是那块地方该用的工具。

## 参考资料

- 相关：[record 与 class 对比](record-vs-class.md)
- 相关：[Span 与内存安全](../dotnet/csharp/modern-csharp.md#span)
- 相关：[.NET 版本演进](net-evolution.md)
- 官方文档：[ImmutableArray&lt;T&gt;](https://learn.microsoft.com/dotnet/api/system.collections.immutable.immutablearray-1)
