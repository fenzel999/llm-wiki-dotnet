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

## 概述

.NET 10 的 JIT（Just-In-Time，即时编译器）持续增强热路径（hot path）性能。核心包括动态 PGO（Profile-Guided Optimization，基于运行时剖析的优化，默认启用）、更强的内联（inlining）与去虚化（devirtualization）、循环优化（如循环克隆、边界检查消除）以及对 `Span<T>` / 栈分配的更好处理。多数收益无需改动代码即可获得——只要写出 JIT 友好的代码，升级到 .NET 10 后自然更快。

## 正确做法

一般无需特殊配置即享受优化；写出 JIT 友好的代码即可，例如用 `ReadOnlySpan<T>` 避免分配、让循环边界可被静态分析消除：

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

若需对比或临时关闭动态 PGO 做基准测试，可用环境变量：

```csharp
// 环境变量：DOTNET_TieredPGO=0 可关闭动态 PGO 以对比
// 默认无需设置，PGO 已默认开启
```

补充实践要点：

- 用 BenchmarkDotNet 度量而非目测，注意 JIT 预热（tiered compilation，分层编译）与首次编译开销。
- 避免在热路径中产生大量小对象分配，配合 `Span` 减少 GC 压力。

## 反例（常见错误）

- 用 Debug 构建做性能基准：Debug 未开启优化，结果不能代表生产性能。
- 测量前未预热（warm-up）：分层编译下首轮执行会触发 JIT 编译，应丢弃首轮再计时。
- 在热路径频繁分配闭包 / 临时对象，徒增 GC 压力，抵消 JIT 优化收益。
- 凭直觉“改了一定更快”却不跑基准验证，可能反而因破坏内联而变慢。

## 适用版本

=== "net10"
    动态 PGO 默认启用，循环与内联优化进一步增强。

=== "net8"
    已默认启用动态 PGO，但优化范围较小。

## 参考资料

- 相关：[隐式 Span 转换](../csharp/csharp-14.md#implicit-span-conversions)
- 相关：[原生 AOT](../native-aot.md)
- 官方文档：[.NET runtime compilation config (PGO)](https://learn.microsoft.com/dotnet/core/runtime-config/compilation)
