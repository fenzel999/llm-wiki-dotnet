---
title: .NET 主题地图
summary: .NET 8 / 9 / 10（C# 12 / 13 / 14）知识导航页，链接到各子主题与版本特性页。
tags: [dotnet, csharp, overview, net8, net9, net10]
introduced-in: net8
applies-to: [net8, net9, net10]
status: stable
source: sources/README.md
updated: 2026-07-09
---

## 概述

本 Wiki 覆盖 **.NET 8（LTS）/ .NET 9（STS）/ .NET 10（LTS）**，对应 **C# 12 / 13 / 14**。
内容以**主题优先**组织，版本差异通过每页 `introduced-in` / `applies-to` 与 `===` 选项卡表达
（详见 [.NET 版本演进](../comparisons/net-evolution.md)）。本页是 .NET 方向的入口地图。

## 正确做法

按主题选择起点：

- **运行时与部署**
  - [文件型应用（file-based apps）](file-based-apps.md)：无需项目文件即可运行单文件程序。
  - [原生 AOT（Native AOT）](native-aot.md)：提前编译（ahead-of-time compilation）与 trimming（裁剪）。
  - [JIT 性能优化](runtime/jit-optimizations.md)：PGO 与循环优化等运行时改进。

- **C# 14 语言特性**
  - [extension 成员](csharp/extension-members.md)：统一的扩展方法/属性/运算符。
  - [field 关键字](csharp/field-keyword.md)：在属性中引用编译器生成的支持字段（backing field）。
  - [空条件赋值](csharp/null-conditional-assignment.md)：`x?.Y = z;`。
  - [nameof 非绑定泛型](csharp/nameof-unbound-generics.md)：`nameof(List<>)`。
  - [隐式 Span 转换](csharp/implicit-span-conversions.md)：数组/字符串到 Span。
  - [lambda 参数修饰符](csharp/lambda-parameter-modifiers.md)：`ref`/`in`/`out`。

- **ASP.NET Core**
  - [最小 API 内置验证](aspnet-core/minimal-api-validation.md)：自动 400。
  - [原生 OpenAPI 3.1](aspnet-core/openapi-3-1.md)。

- **EF Core**
  - [复杂类型与 JSON 列](ef-core/complex-types-json.md)。
  - [命名查询筛选器](ef-core/named-query-filters.md)。

- **Blazor**
  - [JavaScript 互操作增强](blazor/javascript-improvements.md)。

## 版本对照

- [.NET 8 / C# 12 关键知识](versions/net8.md)：LTS；集合表达式、主构造函数、内联数组、EF Core 8 复杂类型；无内建 OpenAPI / 验证。
- [.NET 9 / C# 13 关键知识](versions/net9.md)：STS；`params` 集合、新 `Lock`、内建 OpenAPI 3.0、`Microsoft.Extensions.AI`。
- [.NET 版本演进](../comparisons/net-evolution.md)：时间线、LTS/STS、C# 版本绑定与 [特性矩阵](versions/net8.md)。

## 适用版本

本 Wiki 覆盖 .NET 8 / 9 / 10。各主题页 frontmatter 标注 `introduced-in` / `applies-to`；跨版本差异（如 OpenAPI 3.0 vs 3.1、是否内建验证）在各页 `## 适用版本` 选项卡中说明。

## 参考资料

- [源汇总 sources/README.md](../sources/README.md)


