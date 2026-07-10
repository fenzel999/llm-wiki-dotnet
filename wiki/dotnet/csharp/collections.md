---
title: 集合选型（List / Dictionary / HashSet / Frozen / Concurrent）
summary: 按访问模式与并发需求选对集合：查找用字典、去重用集合、只读热点用 Frozen、多线程用 Concurrent；AOT 友好。
tags: [collections, list, dictionary, hashset, frozen, concurrent]
introduced-in: general
applies-to: [net8, net9, net10]
status: stable
source: https://learn.microsoft.com/dotnet/standard/collections/
updated: 2026-07-11
---

# 集合选型（List / Dictionary / HashSet / Frozen / Concurrent）

> **要点速览**
> - 按访问模式选：顺序/索引→`List`，按键查找→`Dictionary`，去重/存在性→`HashSet`。
> - 多线程共享用 `Concurrent*`；别给普通集合到处加锁。
> - 构建一次、海量只读用 `Frozen*`（net8+）；需不可变共享用 `Immutable*`。
> - 别用 `ArrayList`/`Hashtable`（已被泛型取代）；已知规模就预设容量。

## 概述

选错集合是很多性能问题的隐秘根源。第一问是**访问模式**：顺序/追加→`List<T>`；按键 O(1) 查找→`Dictionary<K,V>`；只关心存在性/去重→`HashSet<T>`；FIFO/LIFO→`Queue<T>`/`Stack<T>`。第二问是**是否并发**：多线程读写必须用 `System.Collections.Concurrent` 的并发集合，而非给普通集合加锁。net8 起还有两族优化集合：`Frozen`（构建一次、海量只读查找，构建慢但查找极快）与 `Immutable`（不可变安全共享）。

## 选型决策表

| 你要什么 | 用 | 复杂度 |
|----------|----|--------|
| 索引访问、频繁追加 | `List<T>` | 追加 O(1)，查找 O(n) |
| 按键快速查找/映射 | `Dictionary<K,V>` | 查找 O(1) |
| 去重 / 存在性判断 | `HashSet<T>` | O(1) |
| 构建一次、只读查找极热 | `FrozenDictionary`/`FrozenSet`（net8+） | 查找极快 |
| 多线程读写的字典 | `ConcurrentDictionary<K,V>` | 线程安全 |
| 不可变、安全共享 | `ImmutableArray`/`ImmutableDictionary` | 更改返回新实例 |

## 正确做法

```csharp
var byId = orders.ToDictionary(o => o.Id);         // O(1) 按键查找
var seen = new HashSet<string>();
if (seen.Add(email)) { /* 首次出现 */ }

// 构建一次、之后只读、查找极热 → Frozen（net8+）
FrozenDictionary<string, int> lookup = source.ToFrozenDictionary();

// 多线程共享：并发集合而非普通集合加锁
var cache = new ConcurrentDictionary<int, Product>();
var p = cache.GetOrAdd(id, key => Load(key));      // 线程安全的取或建
```

已知规模时预设容量（`new List<T>(capacity)`）避免多次扩容复制。

## 常见误区

❌ **在 `List<T>` 里用 `Contains`/`Find` 频繁查找**（O(n)），数据一大就慢。按键查找用 `Dictionary`/`HashSet`（O(1)）。

❌ **多线程共享普通 `Dictionary` 到处 `lock`**，或干脆不加锁导致并发损坏/死循环。用 `ConcurrentDictionary`。

❌ **还在用 `ArrayList`/`Hashtable`** 非泛型集合——装箱、无类型安全，已被泛型取代。用 `List<T>`/`Dictionary<K,V>`。

❌ **明知数量却不预设容量**。构造时给容量，避免扩容复制。

❌ **为"听起来高级"在频繁变更的集合上硬用 `Frozen`/`Immutable`**。`Frozen` 构建慢、`Immutable` 更改复制；二者只适合"构建一次、之后只读/共享"。

## 适用版本

泛型集合全版本通用；`Frozen*` net8+；`ConcurrentDictionary` 等 net(core) 全版本可用。

### Native AOT 兼容性

BCL 集合均 **AOT 安全**（[AOT 矩阵](../aot/aot-compatibility.md)）。注意：若集合作为 JSON 序列化目标，需 `System.Text.Json` **源生成**（见 [序列化](serialization.md)）；`Frozen`/`Immutable` 本身无运行期反射，但序列化时同样走源生成。

## 参考资料

- [List vs ImmutableArray](../../comparisons/list-vs-immutablearray.md) · [LINQ](linq.md)
- [AOT 兼容性矩阵](../aot/aot-compatibility.md) · [序列化（源生成）](serialization.md)
- 官方文档：[.NET 中的集合](https://learn.microsoft.com/dotnet/standard/collections/) · [Frozen 集合](https://learn.microsoft.com/dotnet/api/system.collections.frozen)
