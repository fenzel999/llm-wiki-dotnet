---
title: .NET 6 / C# 10 关键知识
summary: 首个“统一后”的 LTS——最小 API 与最小托管模型、C# 10 global using/文件级命名空间、DateOnly/TimeOnly、日志源生成器、热重载。已 EOL，保留仍然有效的知识。
tags: [dotnet, net6, csharp10, lts]
introduced-in: net6
applies-to: [net6]
status: deprecated
source: https://learn.microsoft.com/dotnet/core/whats-new/dotnet-6
updated: 2026-07-10
---

> **要点速览**
> - 首个统一 LTS：最小 API、最小托管模型。
> - C# 10：global using、文件范围命名空间、record struct；DateOnly/TimeOnly。
> - **已 EOL**；旧 `Startup.cs` 已被最小托管取代，通用场景见 .NET 10。

## 概述

.NET 6 在 2021 年 11 月发布，是统一之后的**首个 LTS**（支持已于 2024 年 11 月结束，现已 **EOL**）。它完成了从 .NET 5 开始的统一计划，把 SDK、基础库、运行时在移动/桌面/云/IoT 上收敛为一套。对开发者最直接的影响是两件事：**最小 API + 最小托管模型**让 Web 服务的启动代码大幅瘦身，**C# 10** 又把很多样板（`global using`、文件级命名空间）省掉了。

版本虽已 EOL，但这一版确立的写法——最小托管、`DateOnly`/`TimeOnly`、日志源生成器——在 .NET 10 里依然是推荐做法。它对应 **C# 10**。逐版差异见[.NET 版本演进](../../comparisons/net-evolution.md)。

## C# 10 语言特性

- **`global using` 指令**：把常用命名空间集中声明一次，全项目可见；配合 SDK 的隐式 `global using`，新文件几乎不用再写一堆 `using`。见[文件型应用](../aot/file-based-apps.md)。
- **文件级命名空间（file-scoped namespace）**：`namespace Foo;` 一行搞定，省去一层大括号缩进。
- **record struct**：把 C# 9 的 record 值语义带给结构体，兼顾值类型的零堆分配。见[record vs class](../../comparisons/record-vs-class.md)。

```csharp
namespace Sales;                 // 文件级命名空间

public readonly record struct Money(decimal Amount, string Currency);  // record struct
```

## 关键平台特性

- **最小托管模型（minimal hosting）+ 最小 API**：`WebApplication.CreateBuilder(args)` 一把梭，配置 / 日志 / DI 一站式。**旧写法 `Startup.cs` + `Program.cs` 双文件的泛型主机模板已被最小托管取代**（泛型主机本身仍在，用于后台服务，见[组合与架构模式](../../patterns/composition.md#generic-host)）；最小 API 的组织方式见[Minimal API 组织](../../patterns/composition.md#minimal-api-organization)。

```csharp
var builder = WebApplication.CreateBuilder(args);
builder.Services.AddSingleton<IClock, SystemClock>();

var app = builder.Build();
app.MapGet("/time", (IClock clock) => clock.UtcNow);
app.Run();
```

- **`DateOnly` / `TimeOnly`**：终于有了只表示"日期"或"时间"的类型（生日、营业时间），不用再拿 `DateTime` 硬凑。
- **日志源生成器 `LoggerMessage`**：给 `partial` 方法加 `[LoggerMessage]`，编译期生成高性能日志代码，比运行时反射快。见[日志规范](../../standards/quality-engineering.md#logging)。
- **`System.Text.Json` 源生成器 + 可写 DOM（`JsonNode`）**、`IAsyncEnumerable` 序列化。
- **LINQ 新方法**：`Chunk`、`MaxBy`/`MinBy`、`DistinctBy`、`Take(Range)` 等。
- **`PriorityQueue<TElement,TPriority>`**、热重载（`dotnet watch`）、动态 PGO（可选）、Crossgen2、HTTP/3（预览）、.NET MAUI（预览）。
- DI：`CreateAsyncScope` 让注册了 `IAsyncDisposable` 的作用域能安全地用 `using`（见[释放与 using](../../patterns/disposable-using.md)）。

## 适用版本

=== "net6（EOL）"
    最小托管、C# 10、DateOnly/TimeOnly、日志源生成器等可用；该 LTS 已停止支持，**不应用于新项目**。

=== "net10（当前推荐）"
    上述全部保留，并叠加 .NET 8/9/10 的能力（内置 OpenAPI 与验证、`field` 关键字、[Native AOT](../aot/native-aot.md) 更少限制等）。新项目请直接用 [.NET 10](../overview.md)。

## 参考资料

- 官方文档：[What's new in .NET 6](https://learn.microsoft.com/dotnet/core/whats-new/dotnet-6)
- 相关：[.NET 版本演进](../../comparisons/net-evolution.md)
- 相关：[组合与架构模式（最小 API / 泛型主机）](../../patterns/composition.md)
- 相关：[日志规范](../../standards/quality-engineering.md#logging)
- 相关：[.NET 5 / C# 9](net5.md) · [.NET 7 / C# 11](net7.md)
