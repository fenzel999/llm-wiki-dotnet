---
title: ValueTask<T> 与零分配异步
summary: 在结果通常已同步可用(热路径)时用 ValueTask<T> 避免 Task 分配，但不可 await 两次。
tags: [valuetask, 异步, 零分配, 性能]
introduced-in: general
applies-to: [all]
status: stable
source: sources/README.md
updated: 2026-07-09
---

## 概述

`ValueTask<T>`(及非泛型 `ValueTask`)是 [async/await](../concepts/async-await.md) 中减少堆分配的结构体类型。当结果常常已经同步可用(synchronously available)时，返回 `ValueTask<T>` 可避免为每次调用分配一个 `Task` 对象，适合高频调用的热路径(hot path)。

## 正确做法

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

## 常见误区

- 对同一个 `ValueTask<T>` await 两次：第二次结果未定义或抛异常。需要多次 await 时先 `.AsTask()`。
- 在公共 API 广泛返回 ValueTask 增加调用方复杂度，仅在确有分配热点时使用。
- 误以为 ValueTask 一定更快，同步冷路径反而增加开销。

## 参考资料

- [异步](../concepts/async-await.md)
- [Span 内存](../concepts/span-memory.md)
