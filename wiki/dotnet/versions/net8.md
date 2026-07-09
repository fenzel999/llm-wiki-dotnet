---
title: .NET 8 / C# 12 关键知识
summary: .NET 8（LTS）与 C# 12 的主要特性，作为本库多版本知识的一部分。
tags: [dotnet, net8, csharp12]
introduced-in: net8
applies-to: [net8, net9, net10]
status: stable
source: sources/README.md
updated: 2026-07-09
---

# .NET 8 / C# 12 关键知识

.NET 8 于 2023-11 发布（**LTS，到 2026-11 止**），对应 **C# 12**。本页汇总 **v8 独有或 LTS 标志性特性**，强调稳定基础；请查阅 [.NET 版本演进](../comparisons/net-evolution.md) 了解 net10 对它的扩展与替代品。

## C# 12 语言特性

- **集合表达式**：`List<int> a = [1, 2, 3]; var b = [.. a, 0];`，支持 immutable array、Span 等，并辅以主构造函数。
- **主构造函数** (`class Point(int X, int Y);`) - 语言级默认值。
- **内联数组**：`[InlineArray(10)] struct Buf { private int _e; }` - 零分配高性能缓冲区。
- **文件本地类型**：`file class Foo` - 仅当前文件可见。
- **ref 改进**：`ref readonly` 参数、`ref` 字段细化。

```csharp
public class Point(int X, int Y) { public int[] Coords => [X, Y]; }
```

## ASP.NET Core 8

- **无内建 OpenAPI 生成器**：需第三方库（Swashbuckle）才能出 OpenAPI 文档。**自 .NET 9 起提供原生 `AddOpenApi()`，.NET 10 则进一步升级为 3.1。**本库统一采用 .NET 10 方案，不再用 Swashbuckle（见 [原生 OpenAPI 3.1](../aspnet-core/openapi-3-1.md)）。
- **无内置最小 API 验证**。需第三方（如 FluentValidation）或手写过滤器。**自 .NET 10 起提供自动验证**（见 [最小 API 验证](../aspnet-core/minimal-api-validation.md)），本库以该方案为准。

## EF Core 8

- **复杂类型** 正式支持（值对象映射于宿主主键），不需 UoW/Repository 包装。
- **基元集合** 映射（`List<int>` 等存为 JSON/原生值类型）。
- **ExecuteUpdate / ExecuteDelete** 批量编辑命令 - 无须先查再改。

## 适用版本

=== "net8"
    .NET 8 LTS 独有或 LTS 标志性特性。相较 LTS，.NET 9 / .NET 10 不仅向下兼容，还叠加更多新功能（See [.NET 版本演进](../comparisons/net-evolution.md)）。
=== "net9 / net10"
    全部向下兼容；并叠加 [.NET 9](net9.md) / [.NET 10](../overview.md) 新特性。

## 参考资料

- [.NET 版本演进](../comparisons/net-evolution.md) - 时间线与特征矩阵
- [Sources README](../sources/README.md)
