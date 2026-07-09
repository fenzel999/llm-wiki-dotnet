---
title: .NET 10 JIT 性能优化
summary: .NET 10 运行时的 JIT 改进：动态 PGO、循环与内联优化、更好的去虚拟化。
tags: [dotnet, runtime, jit, performance, pgo, net10]
introduced-in: net10
applies-to: [net10]
status: stable
source: sources/README.md
updated: 2026-07-09
---

## 概述

.NET 10 的 JIT（Just-In-Time，即时编译器）持续增强热路径性能。核心包括动态 PGO（Profile-Guided Optimization，基于运行时剖析的优化，默认启用）、更强的内联（inlining）与去虚拟化（devirtualization）、循环优化（如循环克隆、边界检查消除）以及对 `Span<T>`/栈分配的更好处理。多数收益无需改代码即可获得。

## 正确做法

一般无需特殊配置即享受优化；写出 JIT 友好的代码即可：

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

若需对比或临时关闭动态 PGO 做基准测试：

```csharp
// 环境变量：DOTNET_TieredPGO=0 可关闭动态 PGO 以对照
// 默认无需设置，PGO 已默认开启
```

## 正确做法（补充）

- 用 BenchmarkDotNet 度量而非目测，注意 JIT 预热（tiered compilation，分层编译）。
- 避免在热路径中产生大量小对象分配，配合 Span 减少 GC 压力。

## 适用版本

=== "net10"
    动态 PGO 默认启用，循环/内联优化进一步增强。

=== "net8"
    已默认启用动态 PGO，优化范围较小。

## 参考资料

- [源汇总 sources/README.md](../../sources/README.md)
- 相关：[隐式 Span 转换](../csharp/implicit-span-conversions.md)、[原生 AOT](../native-aot.md)
- 官方文档：[.NET runtime compilation config (PGO)](https://learn.microsoft.com/dotnet/core/runtime-config/compilation)

