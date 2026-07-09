---
title: .NET 9 / C# 13 关键知识
summary: .NET 9（STS）与 C# 13 的主要特性，作为本库多版本知识的一部分。
tags: [dotnet, net9, csharp13]
introduced-in: net9
applies-to: [net9, net10]
status: stable
source: https://learn.microsoft.com/dotnet/core/whats-new/dotnet-9
updated: 2026-07-10
---

## 概述

.NET 9 在 2024 年 11 月发布，是一个 **STS（标准期限支持）** 版本，支持窗口到 2026 年 5 月，对应语言版本 **C# 13**。STS 的定位介于两个 LTS 之间：它带来一波新能力，但支持周期比 LTS 短，适合愿意跟新、想用上新特性的项目。和 .NET 8 一样，.NET 9 的全部特性都向下兼容到了 .NET 10，并继续往上叠加更多东西。本页挑出 .NET 9 里最值得记的几块，和 .NET 8 / .NET 10 的逐项差异可看[.NET 版本演进](../../comparisons/net-evolution.md)。

## C# 13 语言特性

C# 13 在“零分配地接收可变数量参数”这件事上给了关键支持：`params` 现在可以作用于 `ReadOnlySpan<T>` 或 `IEnumerable<T>`。这意味着你写的 `Log` 方法既能接收一串散参数，也能直接接收一个栈上的 `Span`，而全程不需要分配一个数组：

```csharp
void Log(params ReadOnlySpan<string> parts)
{
    foreach (var p in parts) Console.Write(p);
}

Log("a", "b", "c");                 // 栈上，无需数组分配
ReadOnlySpan<string> s = ["x", "y"];
Log(s);                            // 直接传 Span
```

另一个值得注意的改进是新的 `System.Threading.Lock` 类型——它取代了传统的 `lock(obj)` 写法，在性能和可观测性上都更好，调试时能更清楚地看到锁的状态。此外 C# 13 还细化了 `params` 与 `ref` 的组合、转译顺序与重载优先级，让这些边缘场景的行为更可预期。

## ASP.NET Core 9

Web 层面，.NET 9 最大的变化是补上了 OpenAPI 的原生生成能力：`Microsoft.AspNetCore.OpenApi` 的 `AddOpenApi()` 在这一版起可用，生成的是 **OpenAPI 3.0**。到了 .NET 10，它又进一步升级到 3.1，详见[原生 OpenAPI 3.1](../aspnet-core/aspnet-core-10.md#openapi-3-1)。另外，.NET 9 在静态资源缓存、计时器、各项目性能上都有改进，原生 AOT 的限制也比 .NET 8 时更少了一些。

## .NET 9 平台能力

如果说 .NET 9 有一个“标志性能力”，那应该是 `Microsoft.Extensions.AI`——一套统一的 AI / LLM 抽象，把 `IChatClient`、`IEmbeddingGenerator`、工具调用这些概念收敛成一套接口，让你能在不同模型厂商之间切换而不用重写业务代码。对 nowadays 几乎每个项目都要碰 AI 的现状来说，这是个很及时的基础件。同期的还有 `HybridCache`（分布式 + 内存的两层缓存抽象）、以及 `Base64Url`、`OrderedDictionary<TKey,TValue>`、`TensorPrimitives` 这类基础库增强。EF Core 9 与 AOT / trimming 也都在持续改进。

## 适用版本

=== "net9"
    上述 C# 13 / Microsoft.Extensions.AI / HybridCache 等可用。

=== "net10"
    全部向下兼容，并叠加 [.NET 10](../overview.md) 新特性（如 `field` 关键字、内置验证、OpenAPI 3.1）。

## 参考资料

- 相关：[.NET 版本演进](../../comparisons/net-evolution.md)
- 相关：[.NET 10 主题地图](../overview.md)
- 官方文档：[What's new in .NET 9](https://learn.microsoft.com/dotnet/core/whats-new/dotnet-9)
