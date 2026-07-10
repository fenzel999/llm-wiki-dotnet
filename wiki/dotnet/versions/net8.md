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

> **要点速览**
> - LTS：C# 12 集合表达式 `[..]`、主构造函数、内联数组。
> - Frozen 集合、keyed DI、`TimeProvider` 可测时钟。
> - ASP.NET Core 8 与 EF Core 8 关键更新；仍在支持期。

## 概述

.NET 8 在 2023 年 11 月发布，是一个 **LTS（长期支持）** 版本，支持窗口到 2026 年 11 月，对应的语言版本是 **C# 12**。对大多数团队来说，LTS 的意义在于“稳”——它适合作为长期驻留的生产系统的基线。也正因为是 LTS，.NET 8 的所有特性都向下兼容到了 .NET 9 和 .NET 10：你今天在 .NET 8 上学到的东西，到了新版本依然成立，只是新版本又往上叠了更多能力。

本页把 .NET 8 独有、或者最能代表这一版“稳定基础”的特性梳理出来，方便你判断“我在 .NET 8 上能用到什么、又被新版本补强了什么”。和 .NET 9 / .NET 10 的逐项演进对比，可以看[.NET 版本演进](../../comparisons/net-evolution.md)。

## C# 12 语言特性

C# 12 的方向很清晰：让集合和类型的书写更紧凑。集合表达式（collection expressions）大概是这一版最常被用到的语法——你可以用 `[1, 2, 3]` 这种字面量直接初始化 `List<int>`、`ImmutableArray`、甚至 `Span<T>`，还能用展开运算符 `[.. a, 0]` 拼接：

```csharp
public class Point(int X, int Y) { public int[] Coords => [X, Y]; }
```

顺着这个思路，主构造函数（primary constructors）也从 `record` 扩展到了普通的 `class` 和 `struct`，`class Point(int X, int Y);` 就能直接拿到构造参数，不用再手写一堆私有字段。还有内联数组（`[InlineArray(10)]`）用于在栈上放一块高性能缓冲、文件本地类型（`file class Foo`）让某个类型只在当前文件可见，以及 `ref readonly` 参数、`ref` 字段这类对底层代码更精细的控制。

## ASP.NET Core 8

Web 这块要特别提一下，因为它和本库“只用 .NET 10 方案”的约定直接相关。.NET 8 本身**没有内置的 OpenAPI 生成器**——想要一份 OpenAPI 文档，当时得靠 Swashbuckle 这类第三方库。而本库统一采用的办法是 .NET 10 的原生方案：从 .NET 9 起框架提供 `AddOpenApi()`（生成 3.0），到 .NET 10 升级为 3.1，详见[原生 OpenAPI 3.1](../aspnet-core/aspnet-core-10.md#openapi-3-1)。最小 API 的验证也是同理：.NET 8 没有内置验证，要么手写过滤器要么用 FluentValidation；.NET 10 起框架自动校验，见[最小 API 验证](../aspnet-core/aspnet-core-10.md#minimal-api-validation)。所以如果你在维护一个 .NET 8 项目，知道“这些能力那时还得靠第三方”就够了。

## EF Core 8

数据层面，.NET 8 有几个实打实的增强。复杂类型（complex types）在这一版正式落地，让没有主键的值对象能干净地挂在宿主实体上——这正是后面 .NET 10 继续完善的基础，详见[复杂类型与 JSON 列](../ef-core/ef-core-10.md#complex-types-json)。基元集合（primitive collections）也能直接映射了，`List<int>` 这类可以存成 JSON 或原生值类型列。最实用的可能是 `ExecuteUpdate` / `ExecuteDelete`：批量改、批量删可以直接翻译成一条 SQL 命令发到数据库，不用先 `Find` 再改动、再 `SaveChangesAsync` 那样绕一圈。

## 适用版本

=== "net8"
    .NET 8 LTS 独有或与 LTS 标志性特性。相较后续版本，.NET 9 / .NET 10 不仅向下兼容，还叠加了更多新功能（见 [.NET 版本演进](../../comparisons/net-evolution.md)）。

=== "net9 / net10"
    全部向下兼容；并叠加 [.NET 9](net9.md) / [.NET 10](../overview.md) 新特性。

## 参考资料

- 相关：[.NET 版本演进](../../comparisons/net-evolution.md) — 时间线与特性矩阵
- 相关：[Sources README](../../sources/README.md)
- 官方文档：[What's new in .NET 8](https://learn.microsoft.com/dotnet/core/whats-new/dotnet-8)
