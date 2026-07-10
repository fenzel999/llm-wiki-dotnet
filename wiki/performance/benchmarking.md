---
title: 基准测试（BenchmarkDotNet）
summary: 性能与诊断——先测量再优化，用 .NET 基金会的 BenchmarkDotNet 做可靠微基准；基线对比 + 内存诊断；AOT 也要基准。
tags: [performance, benchmark, benchmarkdotnet]
introduced-in: general
applies-to: [net8, net9, net10]
status: stable
source: https://learn.microsoft.com/dotnet/core/testing/
updated: 2026-07-11
---

# 基准测试（BenchmarkDotNet）

> **要点速览**
> - **定位**：基准测试属于**性能与诊断**这一类横切关注点，用于验证"改了到底快没快"（见同组 [GC 与内存](gc-memory.md)、[诊断与性能剖析](diagnostics.md)）。
> - 第一原则：**先测量，别猜**。微基准用 **BenchmarkDotNet**（.NET 基金会项目，符合 [P10](../governance/policy.md)）。
> - 别用 `Stopwatch` 手写下结论（无预热、无统计、受干扰）。
> - 必须 **Release** 运行；加 `[MemoryDiagnoser]` 同时看分配；设 **Baseline** 对比。
> - AOT 发布后性能可能与 JIT 不同，**AOT 也要单独基准**。

## 概述

性能优化的第一原则是：**先测量，别猜**。凭直觉改代码往往优化了根本不热的路径，甚至改慢了。做可靠的微基准，标准工具是 **BenchmarkDotNet**（.NET 基金会项目）。它替你处理了手写计时器几乎不可能做对的事：JIT 预热、多次迭代取统计、隔离进程、自动测内存分配、输出带标准差的可信结果。

千万别用 `Stopwatch` 手写"跑一次看耗时"来下结论——没预热、没多次采样、受 GC 和后台干扰，结论几乎必然是错的。BenchmarkDotNet 让基准可复现、可比较。

## 正确做法

### 1. 标注对比方法 + 基线 + 内存诊断

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

### 2. 何时做基准？决策表

| 场景 | 做基准？ | 理由 |
|------|----------|------|
| 选定优化方案前的对比（A vs B） | ✅ | 量化"谁更快/更省内存" |
| 优化后回归验证 | ✅ | 确认没有改慢、没有引入分配 |
| 找"全局热点" | ❌ 先用[诊断工具](diagnostics.md) | 基准是微观对比，热点要先靠剖析 |
| 每天跑几次的冷路径 | ❌ | 优化收益可忽略，先测热路径 |
| AOT 发布前后 | ✅ | JIT 与 AOT 代码生成不同，要各自量 |

### 3. 怎么读结果

- 看 **Mean / StdDev**：StdDev 过大说明受干扰，结果不可信，应隔离机器重跑。
- 看 **Allocated**：GC 压力常比纯 CPU 更致命，优先消减大分配。
- 用 **Baseline=1.00** 的比率横向比，比绝对毫秒更稳。

## 常见误区

❌ **用 `Stopwatch` 跑一次就下结论**：没预热、无统计、受干扰，数字不可信。用 BenchmarkDotNet。

❌ **在 Debug 配置下测**：未优化的 IL + JIT，结果与生产差之千里。基准必须 Release。

❌ **微优化冷路径**：优化一个每天只跑几次的冷路径，却不去碰真正热点。先用 [诊断工具](diagnostics.md) 找到热点，再基准它。

❌ **只看时间不看分配**。很多性能问题源于 GC 压力，`[MemoryDiagnoser]` 的分配数据同样关键。

❌ **只测 JIT 版就宣称 AOT 也快**。AOT 的代码生成路径不同，发布 AOT 后务必单独基准。

## 适用版本

BenchmarkDotNet 支持各受支持 .NET 版本；示例面向 net8+。

### Native AOT 兼容性

BenchmarkDotNet 本身在 **JIT（普通 Release）** 下运行；若要评估 AOT 发布的性能，需把被测代码**单独 AOT 发布**后再基准（可在一个 AOT 可执行里跑 BenchmarkDotNet 的精简循环，或用 CLI 计时对比）。AOT 与 JIT 的代码生成不同，结论不能互相替代（见 [AOT 兼容性矩阵](../dotnet/aot/aot-compatibility.md)）。

## 参考资料

- [GC 与内存](gc-memory.md) · [诊断与性能剖析](diagnostics.md) · [Span 与 Memory](../dotnet/csharp/modern-csharp.md#span)
- [AOT 兼容性矩阵](../dotnet/aot/aot-compatibility.md)
- 官方文档：[.NET 测试与性能](https://learn.microsoft.com/dotnet/core/testing/)
