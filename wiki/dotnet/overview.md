---
title: .NET 主题地图
summary: .NET 8 / 9 / 10（C# 12 / 13 / 14）知识导航页，链接到各子主题与版本特性页。
tags: [dotnet, csharp, overview, net8, net9, net10]
introduced-in: net8
applies-to: [net8, net9, net10]
status: stable
source: https://learn.microsoft.com/dotnet/core/whats-new/dotnet-10
updated: 2026-07-10
---

## 概述

本 Wiki 覆盖 **.NET 8（LTS）/ .NET 9（STS）/ .NET 10（LTS）**，对应 **C# 12 / 13 / 14**。内容以**主题优先**组织，版本差异通过每页 `introduced-in` / `applies-to` 与 `===` 选项卡表达（详见 [.NET 版本演进](../comparisons/net-evolution.md)）。本页是 .NET 方向的入口地图，按技术分组列出各子主题。

## 主题地图

- **运行时与部署**
  - [文件型应用（file-based apps）](file-based-apps.md)：无需项目文件即可运行单文件程序。
  - [原生 AOT（Native AOT）](native-aot.md)：提前编译（ahead-of-time compilation）与 trimming（裁剪）。
  - [JIT 性能优化](runtime/jit-optimizations.md)：PGO 与循环优化等运行时改进。

- **C# 14 语言特性**
  - [C# 14 新特性](csharp/csharp-14.md)：extension 成员、field 关键字、空条件赋值、nameof 非绑定泛型、隐式 Span 转换、lambda 参数修饰符。

- **ASP.NET Core**
  - [ASP.NET Core 10](aspnet-core/aspnet-core-10.md)：最小 API 内置验证、原生 OpenAPI 3.1。

- **EF Core**
  - [EF Core 10](ef-core/ef-core-10.md)：复杂类型与 JSON 列、命名查询筛选器。
  - [EF Core 数据访问](ef-core/ef-data-access.md)：不引入 Repository / Unit of Work 的约定。

- **Blazor**
  - [JavaScript 互操作增强](blazor/javascript-improvements.md)。

## 版本对照

- [.NET 8 / C# 12 关键知识](versions/net8.md)：LTS；集合表达式、主构造函数、内联数组、EF Core 8 复杂类型；无内建 OpenAPI / 验证。
- [.NET 9 / C# 13 关键知识](versions/net9.md)：STS；`params` 集合、新 `Lock`、内建 OpenAPI 3.0、`Microsoft.Extensions.AI`。
- [.NET 版本演进](../comparisons/net-evolution.md)：时间线、LTS/STS、C# 版本绑定与特性矩阵。

## 参考资料

- 相关：[源汇总 sources/README.md](../sources/README.md)
- 相关：[.NET 版本演进](../comparisons/net-evolution.md)
