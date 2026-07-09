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

.NET 8 于 2023-11 发布（**LTS**，支持到 2026-11）。对应 **C# 12**。本页汇总其在 C# 语言、
ASP.NET Core、EF Core 方面的关键能力；与 .NET 10 的差异见 [.NET 版本演进](../../comparisons/net-evolution.md)。

## C# 12 语言特性

- **集合表达式（Collection Expressions）**：用 `[1, 2, 3]` 统一初始化数组/`List`/`Span`/`ImmutableArray` 等，
  支持 spread `..other` 展开。
- **主构造函数（Primary Constructors）**：`class` / `struct` 也可写主构造函数（record 早已有）。
- **内联数组（Inline Arrays）**：`[InlineArray(10)] struct Buf { private int _e; }` 固定大小缓冲区，零分配高性能。
- **文件本地类型（File-local types）**：`file class Foo` 仅当前文件可见。
- **ref 改进**：`ref readonly` 参数、`ref` 字段更完善；`params` 暂不支持集合（C# 13 才有）。

```csharp
// 集合表达式 + 主构造函数
public class Point(int X, int Y)
{
    public int[] Coords => [X, Y];          // 集合表达式
    public int[] WithOffset => [.. Coords, 0]; // spread
}
```

## ASP.NET Core 8

- `MapGroup` 路由分组成熟可用；原生 AOT 支持起步（net8 起 ASP.NET Core 可发布为 AOT，但限制较多）。
- **无内建 OpenAPI 生成器**：net8 生成 API 文档仍依赖 Swashbuckle 等第三方（[原生 OpenAPI 3.1](../aspnet-core/openapi-3-1.md) 从 .NET 9 起内建）。
- 最小 API 验证：**无内建**；需用 FluentValidation 或手写过滤器（.NET 10 才内建，见 [最小 API 验证](../aspnet-core/minimal-api-validation.md)）。

## EF Core 8

- **复杂类型（Complex Types）** 正式支持（值对象映射）。
- **基元集合（Primitive Collections）** 映射（`List<int>` 等存为 JSON/值）。
- `ExecuteUpdate` / `ExecuteDelete` 批量命令（无需先查再改）。

## 适用版本

=== "net8"
    上述 C# 12 / EF Core 8 / ASP.NET Core 8 特性可用。
=== "net9 / net10"
    全部向下兼容；并叠加 [.NET 9](net9.md) / [.NET 10](../overview.md) 新特性。
