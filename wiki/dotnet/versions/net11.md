---
title: .NET 11 / C# 15 前瞻（预览）
summary: .NET 11（STS，2026-11 GA）与 C# 15 的重点方向，预览期知识；生产仍用 .NET 10 LTS。
tags: [dotnet, net11, csharp15, preview]
introduced-in: net11
applies-to: [net11]
status: preview
source: https://learn.microsoft.com/dotnet/core/whats-new/dotnet-11/overview
updated: 2026-07-10
---

> **要点速览**
> - **预览期，勿用于生产**：.NET 11 是 STS，预计 2026-11 GA；当前生产请继续用 [.NET 10 LTS](../overview.md)。
> - C# 15 头条：**联合类型（union）**、**封闭类层次（closed）**、集合表达式实参。
> - 运行时头条：**Runtime Async**（异步更省分配、更好调试）。
> - 库：`System.Text.Json` 支持 JSON Lines、LINQ 全外连接 `FullJoin`、内置 Zstandard 压缩。

## 概述

.NET 11 目前处于**预览阶段**（本页依据 Preview 5，2026-06），预计 **2026 年 11 月正式发布**，是 **STS（标准期限支持）** 版本，对应 **C# 15**。按 [POLICY P12](../../governance/policy.md) 与质量准则 [Q2](../../governance/qa.md)，**预览特性不写成稳定承诺**：本页仅作前瞻，API 与行为在 GA 前仍可能变化。**生产项目请继续用 [.NET 10 LTS](../overview.md)**（GA 于 2025-11，支持到 2028）。

## C# 15 语言方向

C# 15 最受关注的是把"一个值可能是若干类型之一"这件事变成语言一等公民：

- **联合类型（`union`）**：声明一个值类型，其值可以是一组固定 case 类型之一，配合模式匹配做穷尽性检查。
- **封闭类层次（`closed`）**：`closed` 基类只能在同一程序集内被直接派生，编译器据此对 `switch` 表达式做穷尽性检查。
- **集合表达式实参**：集合表达式（`[...]`）可携带实参，进一步统一集合初始化语法。

```csharp
// 预览语法，GA 前可能调整
public record class Dog(string Name);
public record class Cat(int Lives);
public union Pet(Dog, Cat);

static string Describe(Pet pet) => pet switch
{
    Dog(var name) => $"dog: {name}",
    Cat(var lives) => $"cat: {lives}"      // 编译器可校验穷尽
};
```

这类特性让"用类型表达有限状态"更安全，是对 [C# 14](../csharp/csharp-14.md) 记录/模式匹配路线的延续。

## 运行时与库

- **Runtime Async**：把 `async`/`await` 的挂起做进运行时，减少分配、改善调试体验，对异步密集的 API/微服务/数据管道收益明显。
- **`System.Text.Json` 支持 JSON Lines**：原生读写 `.jsonl`，适合日志/流式数据。
- **LINQ 全外连接**：新增 `FullJoin` 及返回元组的 `Join`/`GroupJoin` 重载。
- **内置 Zstandard 压缩**：无需第三方依赖即可用 zstd。
- **SDK**：文件型应用支持 `#:include` 拆分多文件；CLI 遥测由 OpenTelemetry 取代 Application Insights。

## 适用版本

=== "net10 (推荐生产)"
    当前 LTS，特性稳定，见 [.NET 10 主题地图](../overview.md)。

=== "net11 (预览)"
    上述 C# 15 / Runtime Async / JSON Lines 等在预览 SDK 中可试用，GA 前可能变化，**勿用于生产**。

## 参考资料

- 相关：[.NET 版本演进](../../comparisons/net-evolution.md) · [.NET 10 主题地图](../overview.md) · [C# 14](../csharp/csharp-14.md)
- 官方文档：[What's new in .NET 11](https://learn.microsoft.com/dotnet/core/whats-new/dotnet-11/overview) · [What's new in C# 15](https://learn.microsoft.com/dotnet/csharp/whats-new/csharp-15)
