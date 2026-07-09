---
title: .NET 8 / C# 12 关键知识
summary: .NET 8（LTS）与 C# 12 的主要特性，作为本库多版本知识的一部分。
tags: [dotnet, net8, csharp12]
introduced-in: net8
applies-to: [net8, net9, net10]
status: stable
source: https://learn.microsoft.com/dotnet/core/whats-new/dotnet-8
updated: 2026-07-10
---

## 概述

.NET 8 于 2023-11 发布（**LTS，到 2026-11 止**），对应 **C# 12**。本页汇总 .NET 8 独有或与 LTS 标志性的特性，强调稳定基础；与 .NET 9 / .NET 10 的差异及演进请查阅 [.NET 版本演进](../../comparisons/net-evolution.md)。作为 LTS，.NET 8 的特性全部向下兼容到 .NET 9 与 .NET 10。

## C# 12 语言特性

- **集合表达式**：`List<int> a = [1, 2, 3]; var b = [.. a, 0];`，支持 immutable array、`Span` 等，并配合主构造函数。
- **主构造函数**（`class Point(int X, int Y);`）：语言级默认值，减少样板。
- **内联数组**：`[InlineArray(10)] struct Buf { private int _e; }`，用于栈分配高性能缓冲。
- **文件本地类型**：`file class Foo`，仅当前文件可见。
- **ref 改进**：`ref readonly` 参数、`ref` 字段细化。

```csharp
public class Point(int X, int Y) { public int[] Coords => [X, Y]; }
```

## ASP.NET Core 8

- **无内建 OpenAPI 生成器**：需第三方库（Swashbuckle）方能出 OpenAPI 文档。自 .NET 9 起提供原生 `AddOpenApi()`，.NET 10 则进一步升级为 3.1。本库统一采用 .NET 10 方案，不再用 Swashbuckle（见 [原生 OpenAPI 3.1](../aspnet-core/aspnet-core-10.md#openapi-3-1)）。
- **无内建最小 API 验证**：需第三方（如 FluentValidation）或手写过滤器。自 .NET 10 起提供自动验证（见 [最小 API 验证](../aspnet-core/aspnet-core-10.md#minimal-api-validation)），本库以该方案为准。

## EF Core 8

- **复杂类型** 正式支持（值对象映射于宿主主键），无需 UoW/Repository 包装。
- **基元集合** 映射（`List<int>` 等存为 JSON / 原生值类型）。
- **ExecuteUpdate / ExecuteDelete** 批量编辑命令——无需先查再改。

## 适用版本

=== "net8"
    .NET 8 LTS 独有或与 LTS 标志性特性。相较后续 LTS，.NET 9 / .NET 10 不仅向下兼容，还叠加更多新功能（见 [.NET 版本演进](../../comparisons/net-evolution.md)）。

=== "net9 / net10"
    全部向下兼容；并叠加 [.NET 9](net9.md) / [.NET 10](../overview.md) 新特性。

## 参考资料

- 相关：[.NET 版本演进](../../comparisons/net-evolution.md) — 时间线与特性矩阵
- 相关：[Sources README](../../sources/README.md)
- 官方文档：[What's new in .NET 8](https://learn.microsoft.com/dotnet/core/whats-new/dotnet-8)
