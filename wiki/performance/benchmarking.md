---
title: 基准测试（BenchmarkDotNet）
summary: 用 .NET 基金会的 BenchmarkDotNet 做可靠微基准，先测量再优化，避免凭感觉调优。
tags: [performance, benchmark, benchmarkdotnet]
introduced-in: general
applies-to: [all]
status: stable
source: https://learn.microsoft.com/dotnet/core/testing/
updated: 2026-07-10
---

> **要点速览**
> - 先测量再优化；微基准用 **BenchmarkDotNet**（.NET 基金会）。
> - 别用 `Stopwatch` 手写下结论（无预热、无统计、受干扰）。
> - 必须 **Release** 运行；加 `[MemoryDiagnoser]` 同时看分配。
> - 先用[诊断工具](diagnostics.md)找热点，再基准它，别优化冷路径。

## 概述

性能优化的第一原则是：**先测量，别猜**。凭直觉改代码往往优化了根本不热的路径，甚至改慢了。做可靠的微基准，标准工具是 **BenchmarkDotNet**（.NET 基金会项目，符合 [P10](../governance/policy.md)）。它替你处理了手写计时器几乎不可能做对的事：JIT 预热、多次迭代取统计、隔离进程、自动测内存分配、输出带标准差的可信结果。

千万别用 `Stopwatch` 手写"跑一次看耗时"来下结论——没预热、没多次采样、受 GC 和后台干扰，结论几乎必然是错的。BenchmarkDotNet 让基准可复现、可比较。

## 正确做法

用 `[Benchmark]` 标注对比方法，加 `[MemoryDiagnoser]` 同时看分配，以 Release 运行：

```csharp
[MemoryDiagnoser]                       // 同时报告内存分配
public class StringBenchmarks
{
    private readonly string[] _parts = Enumerable.Range(0, 100).Select(i => i.ToString()).ToArray();

    [Benchmark(Baseline = true)]
    public string Concat() => _parts.Aggregate("", (a, b) => a + b);   // 基线

    [Benchmark]
    public string Builder()
    {
        var sb = new StringBuilder();
        foreach (var p in _parts) sb.Append(p);
        return sb.ToString();
    }
}

// Program.cs
BenchmarkRunner.Run<StringBenchmarks>();
```

```bash
dotnet run -c Release   # 必须 Release，Debug 结果无意义
```

## 常见误区

❌ 用 `Stopwatch` 跑一次就下结论：没预热、无统计、受干扰，数字不可信。用 BenchmarkDotNet。

❌ 在 Debug 配置下测：未优化的 IL + JIT，结果与生产差之千里。基准必须 Release。

❌ 微优化一个每天只跑几次的冷路径，却不去碰真正的热点。先用 [诊断工具](../performance/diagnostics.md) 找到热点，再基准它。

❌ 只看时间不看分配。很多性能问题源于 GC 压力，`[MemoryDiagnoser]` 的分配数据同样关键。

## 适用版本

BenchmarkDotNet 支持各受支持 .NET 版本。

## 参考资料

- [GC 与内存](gc-memory.md)
- [诊断与性能剖析](diagnostics.md)
- [Span 与 Memory](../dotnet/csharp/modern-csharp.md#span)
- 官方文档：[.NET 测试与性能](https://learn.microsoft.com/dotnet/core/testing/)
