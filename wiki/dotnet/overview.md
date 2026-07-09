---
title: .NET 10 / C# 14 主题地图
summary: .NET 10（LTS）与 C# 14 新特性的导航页，链接到各子主题页面。
tags: [dotnet, csharp, overview, net10]
introduced-in: net10
applies-to: [net10]
status: stable
source: sources/README.md
updated: 2026-07-09
---

## 概述

.NET 10 于 2025-11-11 发布，是长期支持（LTS，Long-Term Support）版本，支持至 2028-11-14，随附语言版本为 C# 14。本页汇总本 Wiki 收录的 .NET 10 / C# 14 主题，便于按方向查阅。

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

## 适用版本

本 Wiki 主要面向 .NET 10 / C# 14。部分特性在旧版本存在雏形时会在各页 `## 适用版本` 中说明。

## 参考资料

- [源汇总 sources/README.md](../sources/README.md)


