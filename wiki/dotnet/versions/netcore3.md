---
title: .NET Core 3.0 / 3.1 / C# 8 关键知识
summary: 现代 .NET 的奠基版本——C# 8（可空引用、异步流、范围索引）、内置 System.Text.Json、单文件/裁剪/R2R、Windows 桌面回归。已 EOL，仅保留仍然有效的基础知识。
tags: [dotnet, netcore3, csharp8]
introduced-in: netcore3.0
applies-to: [netcore3.0, netcore3.1]
status: deprecated
source: https://learn.microsoft.com/dotnet/core/whats-new/dotnet-core-3-0
updated: 2026-07-10
---

## 概述

.NET Core 3.0 在 2019 年 9 月发布，紧接着 3.1 在 2019 年 12 月作为 **LTS** 稳定下来（支持已于 2022 年 12 月结束，现已 **EOL**）。虽然版本本身早已过时，但它是**现代 .NET 的奠基版本**：今天你在 .NET 10 里天天用的很多东西——C# 8 的可空引用类型、异步流、范围与索引，内置的 `System.Text.Json`，单文件发布与裁剪，Windows 桌面（WPF/WinForms）跑在 .NET Core 上——都是从这一版开始的。

本页只保留**至今仍然成立**的基础知识；凡是后续版本已经取代的写法，只用一句话标明并指向当前推荐。它对应的语言版本是 **C# 8**。逐版差异见[.NET 版本演进](../../comparisons/net-evolution.md)。

## C# 8 语言特性

C# 8 是 C# 迈向"安全、现代"的关键一版，其中好几项至今仍是主流写法：

- **可空引用类型（NRT）**：把"可能为 null"变成类型系统的一部分，编译期就能拦住大量 `NullReferenceException`。详见[可空引用类型](../csharp/modern-csharp.md#nullable)。
- **异步流（async streams）**：`IAsyncEnumerable<T>` + `await foreach`，让"逐条异步产出"变得自然。参见[异步编程](../csharp/async-await.md)。
- **范围与索引**：`^` 从末尾计数、`..` 取切片，配合 `Span<T>` 零拷贝切片非常顺手。

```csharp
async IAsyncEnumerable<int> GetBigResultsAsync()
{
    await foreach (var r in GetResultsAsync())
        if (r > 20) yield return r;       // 异步流：边算边产出
}

int[] a = { 0, 1, 2, 3, 4, 5, 6, 7, 8, 9 };
var slice = a[2..^2];                      // 范围/索引：{ 2, 3, 4, 5, 6, 7 }
```

此外还有 `using` 声明（见[释放与 using](../../patterns/disposable-using.md)）、默认接口方法、以及更丰富的模式匹配（见[模式匹配](../csharp/modern-csharp.md#pattern-matching)）。

## 关键平台特性

- **内置 `System.Text.Json`**：这一版起框架自带高性能、低分配、基于 UTF-8 的 JSON 库，ASP.NET Core 也默认改用它。**旧写法 `Newtonsoft.Json` 已被 `System.Text.Json` 取代**（仍可在需要其高级特性时使用，但新项目默认用内置的）。
- **单文件发布与裁剪**：`PublishSingleFile`、`PublishTrimmed` 把应用打包成单个自包含可执行文件并裁掉未用程序集——这条线后来演进为 [.NET 7 的 Native AOT](../aot/native-aot.md)。
- **ReadyToRun（R2R）**：`PublishReadyToRun` 做提前编译改善启动，属于 AOT 的一种形态。
- **分层编译（tiered compilation）默认开启**：兼顾启动速度与稳态性能，后续版本的 [JIT/PGO 优化](../runtime/jit-optimizations.md)都建立在此之上。
- **Windows 桌面回归**：WPF 与 Windows Forms 可以跑在 .NET Core 上（仅 Windows）。
- 还有 gRPC、Worker Service 模板、Blazor Server、HTTP/2、`IAsyncDisposable`。

.NET Core 3.1 相对 3.0 主要是把这些能力**稳定成 LTS**（Blazor、WinForms 设计器、C++/CLI 等的完善），没有大的语言变化。

## 适用版本

=== "netcore3.1（EOL）"
    C# 8、内置 System.Text.Json、单文件/裁剪、Windows 桌面等在此可用；但该版本已停止支持，**不应用于新项目**。

=== "net10（当前推荐）"
    上述基础特性全部保留并被大幅增强：NRT 默认开启、`System.Text.Json` 支持源生成器、单文件/裁剪演进为 [Native AOT](../aot/native-aot.md)。新项目请直接用 [.NET 10](../overview.md)。

## 参考资料

- 官方文档：[What's new in .NET Core 3.0](https://learn.microsoft.com/dotnet/core/whats-new/dotnet-core-3-0)
- 官方文档：[What's new in .NET Core 3.1](https://learn.microsoft.com/dotnet/core/whats-new/dotnet-core-3-1)
- 相关：[.NET 版本演进](../../comparisons/net-evolution.md)
- 相关：[C# 现代语言特性](../csharp/modern-csharp.md)
- 相关：[.NET 5 / C# 9](net5.md)
