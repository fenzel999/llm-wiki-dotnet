---
title: .NET 10 JIT 性能优化
summary: .NET 10 运行时的 JIT 改进：动态 PGO、循环与内联优化、更好的去虚化。
tags: [dotnet, runtime, jit, performance, pgo, net10]
introduced-in: net10
applies-to: [net10]
status: stable
source: https://devblogs.microsoft.com/dotnet/announcing-dotnet-10/
updated: 2026-07-10
---

> **要点速览**
> - .NET 10 JIT 改进：动态 PGO、循环/边界检查优化、更好去虚化。
> - 多数收益**自动获得**，无需改代码；分层编译让热路径逐步优化。
> - 想验证效果用[基准测试](../../performance/benchmarking.md)，别凭感觉。

## 概述

很多人对“性能优化”的想象是：升级到新版本后，照着一份清单改几处代码，程序就快了。但 .NET 的 JIT（Just-In-Time，即时编译器）优化很不一样——它的大部分收益，是在你**什么都不改**的情况下自动发生的。你只要把项目升级到 .NET 10，那些跑得最勤的热路径（hot path）就可能因为 JIT 的改进而变快。本页就讲 .NET 10 运行时在 JIT 上做了哪些事，以及我们写代码时怎么顺着它的脾气走。

核心改进有几块：动态 PGO（Profile-Guided Optimization，基于运行时实际剖析数据的优化，而且默认就开着）、更强的内联（inlining）与去虚化（devirtualization，把虚方法调用在能确定具体类型时直接内联掉）、循环层面的优化（比如循环克隆、边界检查消除），以及对 `Span<T>` 与栈分配更好的处理。把这些合起来看，一句话：写出 JIT 友好的代码，升级后自然更快。

## 正确做法

好消息是，大部分优化你什么都不用配。但“JIT 友好”的代码长什么样？一个典型例子是用 `ReadOnlySpan<T>` 来避免不必要的分配，同时让循环的边界能被静态分析看穿、从而消掉每次迭代的边界检查：

```csharp
static long SumEven(ReadOnlySpan<int> data)
{
    long sum = 0;
    for (int i = 0; i < data.Length; i++)   // 循环长度可被优化，边界检查消除
    {
        if ((data[i] & 1) == 0)
            sum += data[i];
    }
    return sum;
}
```

`Span` 是栈上类型、零分配，JIT 又能确定 `i` 的上界就是 `data.Length`，于是那一行 `data[i]` 的越界检查常常就被整个消掉了。关于 `Span` 在 C# 14 里的隐式转换（比如字符串、数组直接喂给 `ReadOnlySpan` 参数），可以看[隐式 Span 转换](../csharp/csharp-14.md#implicit-span-conversions)——它让这种写法在新版本里更顺手。

如果你想做基准对比，或者临时关掉动态 PGO 看看差异，用环境变量即可，平时完全不用动：

```csharp
// 环境变量：DOTNET_TieredPGO=0 可关闭动态 PGO 以对比
// 默认无需设置，PGO 已默认开启
```

落到实践上，有几条值得记：度量一定要用 BenchmarkDotNet 这类工具，别靠“感觉快了”。注意 JIT 有分层编译（tiered compilation），首轮执行会触发编译，所以基准测试前要先预热（warm-up），把第一轮丢掉再计时。热路径里尽量别制造大量小对象分配，配合 `Span` 把 GC 压力压下来，否则 GC 的停顿会先把 JIT 辛苦换来的收益吃掉。

## 反例（常见错误）

做性能工作的常见错误，几乎都和“测不准”或“测错了”有关。第一，用 Debug 构建做基准：Debug 没开优化，跑出来的数字跟生产环境毫无关系。第二，没预热就计时——分层编译下第一轮会触发 JIT 编译，这段开销混进结果里，结论全歪。第三，热路径里频繁分配闭包或临时对象，GC 压力上来了，JIT 再怎么优化也补不回来。最后，也是最常被忽视的：凭直觉“我这么改一定更快”，却不去跑基准验证。有时候你以为的优化恰恰破坏了内联，反而更慢——性能这东西，没有数据就别下判断。

## 适用版本

=== "net10"
    动态 PGO 默认启用，循环与内联优化进一步增强。

=== "net8"
    已默认启用动态 PGO，但优化范围较小。

## 参考资料

- 相关：[隐式 Span 转换](../csharp/csharp-14.md#implicit-span-conversions)
- 相关：[原生 AOT](../aot/native-aot.md)
- 官方文档：[.NET runtime compilation config (PGO)](https://learn.microsoft.com/dotnet/core/runtime-config/compilation)
