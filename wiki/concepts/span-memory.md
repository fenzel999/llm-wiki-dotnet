---
title: Span<T> 与 Memory<T> 零拷贝内存
summary: 用 Span<T>/ReadOnlySpan<T> 在栈上零拷贝访问连续内存，Memory<T> 适配堆与异步场景。
tags: [span, memory, 性能, 零拷贝]
introduced-in: general
applies-to: [all]
status: stable
source: https://learn.microsoft.com/dotnet/api/system.span-1
updated: 2026-07-09
---

## 概述

`Span<T>` 与 `ReadOnlySpan<T>` 是对连续内存(数组、栈内存、非托管内存)的类型安全零拷贝(zero-copy)视图，只能存在于栈上，因而不能用于 `async` 方法或作为字段。`Memory<T>` 是其可存储于堆、可跨越异步边界的等价物。常用 `stackalloc` 分配栈缓冲，并用 `CollectionsMarshal` 直接获取集合底层缓冲。

## 正确做法

```csharp
// 栈上零拷贝切片
Span<byte> buffer = stackalloc byte[256];
var slice = buffer.Slice(0, 100);
Parse(slice);

// 异步场景使用 Memory<T>
async Task ProcessAsync(Memory<byte> mem)
{
    await File.WriteAsync(mem);
}

// 获取 List<T> 底层数组缓冲（避免拷贝）
var list = new List<int> { 1, 2, 3 };
Span<int> raw = CollectionsMarshal.AsSpan(list);
```

## 常见误区

- 在 `async` 方法或字段中使用 `Span<T>`，编译失败。
- 把 `stackalloc` 缓冲返回给调用方，导致悬垂引用。
- 误以为 `Span<T>` 能替代 `Memory<T>` 用于异步；跨 await 必须用 Memory。

## 参考资料

- [异步](../concepts/async-await.md)
- [ValueTask](../concepts/value-task.md)
