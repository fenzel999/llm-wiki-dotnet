---
title: .NET 5 / C# 9 关键知识
summary: “统一”之版——去掉 Core 之名，net5.0 TFM 合并 netcoreapp/netstandard；C# 9 records、顶层语句、模式匹配增强。已 EOL，仅保留仍然有效的知识。
tags: [dotnet, net5, csharp9]
introduced-in: net5
applies-to: [net5]
status: deprecated
source: https://learn.microsoft.com/dotnet/core/whats-new/dotnet-5
updated: 2026-07-10
---

> **要点速览**
> - 统一之版：net5.0 TFM 合并 netcoreapp/netstandard。
> - C# 9：records、顶层语句、init 属性、模式匹配增强。
> - **已 EOL**，仅保留至今仍有效的知识；通用场景见 [.NET 10](../../index.md)。

## 概述

.NET 5 在 2020 年 11 月发布，是 .NET Core 3.1 的继任者，也是一个 **STS** 版本（支持已于 2022 年 5 月结束，现已 **EOL**）。它的名字里刻意去掉了 "Core"：跳过 4.x 以避免和 .NET Framework 4.x 混淆，并宣告"这就是 .NET 往后唯一的主线实现"。从这一版起，`net5.0` 这个 **TFM** 合并并取代了过去的 `netcoreapp` 与 `netstandard`——一处目标框架就能覆盖控制台、Web、桌面、类库。

版本虽已过时，但 **C# 9 的 records、顶层语句、模式匹配增强**至今是主流写法。它对应语言版本 **C# 9**。逐版差异见[.NET 版本演进](../../comparisons/net-evolution.md)。

## C# 9 语言特性

C# 9 是"不可变数据建模"的分水岭：

- **records**：带值语义（value-based equality）与非破坏性变更（`with` 表达式）的引用类型，几乎消灭了 DTO 的样板代码。详见[record 值语义](../csharp/modern-csharp.md#records)与[record vs class](../../comparisons/record-vs-class.md)。
- **关系与逻辑模式**：模式匹配支持 `<`、`>` 等关系运算，以及 `and` / `or` / `not` 逻辑关键字。见[模式匹配](../csharp/modern-csharp.md#pattern-matching)。
- **顶层语句（top-level statements）**：省掉 `Main` 样板，一行就是一个程序——这正是后来[文件型应用](../aot/file-based-apps.md)与最小 API 风格的语言基础。
- 目标类型 `new`、函数指针等。

```csharp
public record Person(string Name, int Age);          // 值语义 + with

var p1 = new Person("Ann", 30);
var p2 = p1 with { Age = 31 };                        // 非破坏性变更

string Classify(int n) => n switch
{
    < 0 => "负",
    0 => "零",
    > 0 and < 100 => "小正数",                        // 关系 + 逻辑模式
    _ => "大数"
};
```

**源生成器（source generators）**也是在 .NET 5 时代走向主流——编译期检查代码并生成额外源码，见[源生成器](../csharp/modern-csharp.md#source-generators)。

## 关键平台特性

- **统一的 `net5.0` TFM**：类库只需 `net5.0` 即可在各类应用间共享；只有当你还要兼容 .NET Framework 时才继续用 `netstandard2.0`。
- **单文件应用与裁剪增强**：相比 .NET Core 3.0，裁剪从"只裁未用程序集"进步到"连未用类型/成员一起裁"（该能力在 .NET 6 进一步默认开启裁剪警告）。
- **`System.Text.Json` 增强**：支持 C# 9 records、不可变类型、循环引用处理等。
- Windows ARM64、性能（GC、`ValueTask` 池化、正则）大幅改进。

### .NET 5 不取代 .NET Framework / .NET Standard

官方明确：.NET 5+ 是主线，但 .NET Framework 4.x 仍受支持，且有些技术**不会**移植过来，各有替代：

- **Web Forms → [Blazor](../blazor/javascript-improvements.md) 或 Razor Pages**
- **WCF（服务端）→ CoreWCF 或 gRPC**
- **Windows Workflow → 开源 Elsa Workflows**

## 适用版本

=== "net5（EOL）"
    C# 9 records/顶层语句/模式匹配增强、统一 TFM 等可用；该版本已停止支持，**不应用于新项目**。

=== "net10（当前推荐）"
    C# 9 的能力全部保留，并叠加 C# 10–14 的 record struct、`global using`、`field` 关键字、`extension` 块等。新项目请直接用 [.NET 10](../overview.md)。

## 参考资料

- 官方文档：[What's new in .NET 5](https://learn.microsoft.com/dotnet/core/whats-new/dotnet-5)
- 相关：[.NET 版本演进](../../comparisons/net-evolution.md)
- 相关：[record 值语义与不可变建模](../csharp/modern-csharp.md#records)
- 相关：[.NET Core 3.0 / 3.1](netcore3.md) · [.NET 6 / C# 10](net6.md)
