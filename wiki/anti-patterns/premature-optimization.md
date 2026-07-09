---
title: 过早优化（Premature Optimization）
summary: 未经度量就优化、牺牲可读性，应先用清晰正确的实现再按度量优化。
tags: [anti-pattern, performance, readability]
introduced-in: general
applies-to: [all]
status: stable
source: https://learn.microsoft.com/dotnet/standard/performance/
updated: 2026-07-09
---

## 为什么是反模式

“过早优化是万恶之源”。在没有任何性能度量（profiling/benchmark）的情况下，凭直觉用复杂结构、手工内联、避免 allocations 等手段“优化”，往往既没解决真实瓶颈（真实热点通常需要数据才能定位），又大幅牺牲了代码可读性与可维护性，还可能引入新 bug。正确的顺序是：先写正确、清晰、可测试的代码，再用基准测试（BenchmarkDotNet 等）定位热点，针对性优化。

## ❌ 错误写法

```csharp
// 为“可能更快”而牺牲可读性，但没有任何度量证明这是瓶颈
public int CountMatches(string text, char c)
{
    var span = text.AsSpan();
    var count = 0;
    for (var i = 0; i < span.Length; i++)
    {
        if (span[i] == c) count++;
    }
    return count; // 实际 LINQ.Count 已足够，且更清晰
}
```

## ✅ 正确写法

先写清晰正确的版本，确认是瓶颈后再优化：

```csharp
public int CountMatches(string text, char c)
{
    return text.Count(ch => ch == c);
}
```

当基准测试证明此处是热点，再针对该热点做最小化、有注释依据的优化，并保留基准：

```csharp
// 经 BenchmarkDotNet 验证此处为热点（见 MyBench.cs），用 Span 减少分配
public int CountMatches(ReadOnlySpan<char> span, char c)
{
    var count = 0;
    foreach (var ch in span)
    {
        if (ch == c) count++;
    }
    return count;
}
```

## 相关

- [Span 与内存优化](../concepts/span-memory.md)
- [异步最佳实践](../standards/async-best-practices.md)
- [命名规范](../standards/naming.md)
