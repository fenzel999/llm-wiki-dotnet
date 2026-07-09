---
title: 过早优化（Premature Optimization）
summary: 未经度量就优化、牺牲可读性，应先用清晰正确的实现再按度量优化。
tags: [anti-pattern, performance, readability]
introduced-in: general
applies-to: [all]
status: stable
source: https://learn.microsoft.com/dotnet/standard/performance/
updated: 2026-07-10
---

## 为什么是反模式

“过早优化是万恶之源”。在没有任何性能度量（profiling/benchmark）的情况下，凭直觉用复杂结构、手工内联、刻意避免分配等手段去“优化”，往往既没解决真实瓶颈（真实热点通常需要数据才能定位），又大幅牺牲了代码可读性与可维护性，还可能引入新 bug。这种写法常源于对性能的不必要担忧，但其代价是代码更难理解与演进，而收益却多半是臆想出来的。

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

为了一个并未被证实的热点，用 `Span` 加手写循环替代清晰的实现，代码更长也更难读；在没有基准数据支撑时，这种“优化”几乎无法带来真实收益，反而增加了维护负担。

## ✅ 正确写法

先写清晰正确的版本，确认是瓶颈后再针对性优化：

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

遵循“先正确、后度量、再优化”的顺序，可读性版本满足了绝大多数场景，而真正的优化被限制在已验证的热点内，并带有可复现的基准作为依据。

## 如何避免

- 先写清晰、正确、可测试的代码，把优化留到性能度量确认瓶颈之后。
- 用 BenchmarkDotNet 等基准工具定位真实热点，避免凭直觉优化。
- 任何偏离直观写法的优化都附带注释，说明依据与基准来源。

- 相关：[Span 与内存优化](../concepts/span-memory.md)、[异步最佳实践](../standards/async-best-practices.md)、[命名规范](../standards/naming.md)
- 官方文档：[.NET performance](https://learn.microsoft.com/dotnet/standard/performance/)
