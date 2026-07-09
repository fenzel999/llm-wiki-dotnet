---
title: ValueTask<T> 与零分配异步
summary: 在结果通常已同步可用（热路径）时用 ValueTask<T> 避免 Task 分配，但不可 await 两次。
tags: [valuetask, 异步, 零分配, 性能]
introduced-in: netcore20
applies-to: [all]
status: stable
source: https://learn.microsoft.com/dotnet/api/system.threading.tasks.valuetask-1
updated: 2026-07-10
---

## 概述

`ValueTask<T>`（及非泛型 `ValueTask`）是 [async/await](../concepts/async-await.md) 中用于减少堆分配的结构体类型。当方法的结果常常已经同步可用（synchronously available）时，返回 `ValueTask<T>` 可以让命中缓存等“快速路径”避免为每次调用都分配一个 `Task` 对象，这对高频调用的热路径（hot path）尤为关键。代价是 `ValueTask<T>` 的使用约束比 `Task` 更严格：它不能被无条件地多次 `await`，也不应被随意存储。

## 正确做法

把“同步命中”与“异步回退”两条路径都收敛为 `ValueTask<T>` 返回，并在调用处只 `await` 一次。下面的 `ReadAsync` 在缓存命中时直接返回包装了值的 `ValueTask<int>`（零分配），未命中时才走真正的异步读取；调用方只需一次 `await` 即可拿到结果。

```csharp
public ValueTask<int> ReadAsync()
{
    if (_cache.TryGetValue(out var v))
        return new ValueTask<int>(v);            // 同步命中，零分配
    return new ValueTask<int>(SlowReadAsync());  // 异步路径
}

// 仅 await 一次
int result = await ReadAsync();
```

## 反例（常见错误）

❌ 对同一个 `ValueTask<T>` 连续 `await` 两次，第二次的结果未定义，可能返回错误或抛出异常：

```csharp
❌ ValueTask<int> t = ReadAsync();
int a = await t;
int b = await t; // 第二次结果未定义或抛异常
```

- 在公共 API 中盲目铺开 `ValueTask`，会增加调用方的心智负担；只在确有分配热点处使用。
- 误以为 `ValueTask` 永远更快：在同步冷路径上，它反而可能带来额外开销。

## 适用版本

所有受支持版本通用，无差异。

## 参考资料

- [异步](../concepts/async-await.md)
- [Span 内存](../concepts/span-memory.md)
- 官方文档：[ValueTask<T>](https://learn.microsoft.com/dotnet/api/system.threading.tasks.valuetask-1)
