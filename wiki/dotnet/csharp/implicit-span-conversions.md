---
title: 隐式 Span 转换
summary: .NET 10 改进数组到 Span<T>、字符串到 ReadOnlySpan<char> 的隐式转换。
tags: [csharp, span, performance, net10]
introduced-in: net10
applies-to: [net10]
status: stable
source: sources/README.md
updated: 2026-07-09
---

## 概述

.NET 10 / C# 14 改进了隐式 Span（跨度）转换：`string` 可隐式转换为 `ReadOnlySpan<char>`（只读跨度），数组 `T[]` 可隐式转换为 `Span<T>` / `ReadOnlySpan<T>`。这让接受 Span 参数的高性能 API 可直接传入字符串或数组，无需显式 `.AsSpan()`，减少分配并统一重载。

## 正确做法

```csharp
static int CountSpaces(ReadOnlySpan<char> text)
{
    int count = 0;
    foreach (var c in text)
        if (c == ' ') count++;
    return count;
}

// 直接传字符串，隐式转 ReadOnlySpan<char>
int n = CountSpaces("a b c");   // 2
```

数组隐式转 `Span<T>`：

```csharp
static void Fill(Span<int> buffer)
{
    for (int i = 0; i < buffer.Length; i++)
        buffer[i] = i;
}

int[] arr = new int[4];
Fill(arr);   // arr => 0,1,2,3
```

## 常见错误

- 期望 `ReadOnlySpan<char>` 能改写字符串内容：字符串不可变，得到的是只读视图。
- 把栈上或临时 Span 存入字段/异步状态机：`Span<T>` 是 `ref struct`，不能跨 `await` 或装箱。
- 依赖旧代码里手动的 `.AsSpan()` 与新隐式转换产生二义重载解析问题。

## 适用版本

=== "net10"
    数组/字符串到 Span 的隐式转换改进。

=== "net8"
    多数场景需显式 `str.AsSpan()` / `arr.AsSpan()`。

## 参考资料

- [源汇总 sources/README.md](../../sources/README.md)
- 相关：[JIT 性能优化](../runtime/jit-optimizations.md)

