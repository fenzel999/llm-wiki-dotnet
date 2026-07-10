---
title: 集合选型（List / Dictionary / HashSet / Frozen / Concurrent）
summary: 按访问模式与并发需求选对集合：查找用字典、去重用集合、只读热点用 Frozen、多线程用 Concurrent。
tags: [collections, list, dictionary, hashset, frozen, concurrent]
introduced-in: general
applies-to: [all]
status: stable
source: https://learn.microsoft.com/dotnet/standard/collections/
updated: 2026-07-10
---

## 概述

选错集合类型，是很多性能问题的隐秘根源。选型的第一问题是**访问模式**：需要按索引顺序访问、频繁追加 → `List<T>`；需要按键快速查找（O(1)）→ `Dictionary<TKey,TValue>`；只关心"存不存在"、要去重 → `HashSet<T>`；先进先出/后进先出 → `Queue<T>`/`Stack<T>`。第二问题是**是否并发**：多线程读写必须用 `System.Collections.Concurrent` 里的 `ConcurrentDictionary` 等，而不是给普通集合到处加锁。

net8 起还有两族专门优化的集合：**`Frozen`**（`FrozenDictionary`/`FrozenSet`）用于"构建一次、之后海量只读查找"的场景，构建慢但查找极快；**`Immutable`** 用于需要不可变语义与安全共享。别再用早已过时的非泛型集合（`ArrayList`、`Hashtable`）。

## 正确做法

按用途直接选型，避免"用 List 干 Dictionary 的活"：

```csharp
var byId = orders.ToDictionary(o => o.Id);         // O(1) 按键查找
var seen = new HashSet<string>();                  // 去重 / 存在性判断
if (seen.Add(email)) { /* 首次出现 */ }

// 构建一次、之后只读、查找极热 → Frozen（net8+）
FrozenDictionary<string, int> lookup = source.ToFrozenDictionary();
```

多线程共享用并发集合，而非普通集合加锁：

```csharp
var cache = new ConcurrentDictionary<int, Product>();
var p = cache.GetOrAdd(id, key => Load(key));      // 线程安全的取或建
```

## 常见误区

❌ 在 `List<T>` 里用 `Contains`/`Find` 做频繁查找（O(n)），数据一大就慢。需要按键查找就用 `Dictionary`/`HashSet`（O(1)）。

❌ 对多线程共享的普通 `Dictionary` 到处 `lock`，或干脆不加锁导致并发损坏与死循环。用 `ConcurrentDictionary`。

❌ 还在用 `ArrayList`/`Hashtable` 等非泛型集合——装箱、无类型安全，早已被泛型集合取代。用 `List<T>`/`Dictionary<K,V>`。

❌ 明知元素数量却不预设容量：`new List<T>(capacity)` / `new Dictionary(capacity)` 能避免多次扩容复制。

## 适用版本

泛型集合全版本通用；`Frozen*` 集合 net8+；`ConcurrentDictionary` 等 net(core) 全版本可用。

## 参考资料

- [List vs ImmutableArray](../../comparisons/list-vs-immutablearray.md)
- [LINQ](linq.md)
- 官方文档：[.NET 中的集合](https://learn.microsoft.com/dotnet/standard/collections/)
- 官方文档：[Frozen 集合](https://learn.microsoft.com/dotnet/api/system.collections.frozen)
