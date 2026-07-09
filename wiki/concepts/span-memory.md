---
title: Span<T> 与 Memory<T> 零拷贝内存
summary: 用 Span<T>/ReadOnlySpan<T> 在栈上零拷贝访问连续内存，Memory<T> 适配堆与异步场景。
tags: [span, memory, 性能, 零拷贝]
introduced-in: netcore21
applies-to: [all]
status: stable
source: https://learn.microsoft.com/dotnet/api/system.span-1
updated: 2026-07-10
---

## 概述

`Span<T>` 与 `ReadOnlySpan<T>` 是对连续内存（数组、栈内存、非托管内存）的类型安全零拷贝（zero-copy）视图，由于它们本质上是栈上的一段引用，因此只能存在于栈上——不能出现在 `async` 方法或作为类的字段。当内存需要跨过异步边界、或要被长期持有时，应使用其堆友好的等价物 `Memory<T>`。实践中常用 `stackalloc` 在栈上分配临时缓冲，或用 `CollectionsMarshal.AsSpan` 直接拿到集合底层数组，从而在不复制的前提下处理数据。

## 正确做法

在同步热路径上用 `Span<T>` 做切片与解析，把跨异步边界的场景交给 `Memory<T>`，并用 `CollectionsMarshal.AsSpan` 避免不必要的拷贝。下面先在栈上分配 256 字节并切片处理，再展示 `Memory<T>` 如何安全地穿过 `await`，最后用 `AsSpan` 拿到 `List<T>` 的底层缓冲：

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

## 反例（常见错误）

❌ 把 `stackalloc` 得到的缓冲返回给调用方，栈帧回收后该引用即悬垂，访问它是未定义行为：

```csharp
❌ Span<byte> Bad()
{
    Span<byte> buf = stackalloc byte[64];
    return buf; // 悬垂引用：栈内存已回收
}
```

- 在 `async` 方法体或类字段中使用 `Span<T>`，会直接编译失败（无法逃逸到堆/异步边界）。
- 误以为 `Span<T>` 能替代 `Memory<T>` 用于异步：跨 `await` 的缓冲必须用 `Memory<T>`（或 `ReadOnlyMemory<T>`）。

## 适用版本

所有受支持版本通用，无差异。

## 参考资料

- [异步](../concepts/async-await.md)
- [ValueTask](../concepts/value-task.md)
- 官方文档：[Span<T>](https://learn.microsoft.com/dotnet/api/system.span-1)
