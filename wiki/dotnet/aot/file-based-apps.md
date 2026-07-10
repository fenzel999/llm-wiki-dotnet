---
title: 文件型应用（file-based apps）
summary: .NET 10 中无需项目文件即可运行的单文件 C# 程序与隐式 global using。
tags: [dotnet, file-based-apps, net10, tooling]
introduced-in: net10
applies-to: [net10]
status: stable
source: https://learn.microsoft.com/dotnet/core/sdk/file-based-apps
updated: 2026-07-10
---

> **要点速览**
> - .NET 10 支持免项目文件直接运行单文件 C#（`dotnet run app.cs`）。
> - 用 `#:package`/`#:sdk` 指令声明依赖，隐式 global using。
> - 适合脚本/原型；成规模后 `dotnet project convert` 转正式项目。

## 概述

你有没有过这种时候：只是想写几行 C# 验证一个想法、处理一份文本、或者给同事演示一小段逻辑，却得先 `dotnet new console`、在一堆 `.csproj` 里翻找、等 `dotnet build` 跑完？文件型应用（file-based apps）就是为消灭这种“为了跑三行代码而先搭一套工程”的摩擦而生的。它让你写一个 `.cs` 文件，然后直接 `dotnet run app.cs` 就能跑——没有项目文件，没有 `Main` 方法的样板，连 `using` 指令大多都能省掉。

这套体验其实不是 .NET 10 凭空发明的。顶层语句（top-level statements）和隐式全局 using（implicit global usings）早就进了 C#，.NET 10 做的是把它们和 SDK 串起来：现在 SDK 能直接拿一个裸的 `.cs` 文件当“项目”来运行。它最合适的地方是脚本、教学、一次性原型，以及任何“用完即弃”的小工具。

## 正确做法

最极端的例子，一个能完整运行的 `hello.cs` 只需要一行：

```csharp
Console.WriteLine("hi");
```

不用 `using System;`，也不用包在 `class Program { static void Main() {} }` 里——因为 SDK 默认启用了隐式全局 using，它已经把 `System`、`System.Linq`、`System.Collections.Generic` 这类最常用的命名空间暗中引入。所以下面这段也能直接编译运行：

```csharp
var names = new[] { "Ada", "Alan", "Grace" };
foreach (var n in names.Where(x => x.Length <= 3))
    Console.WriteLine(n);
```

运行方式就是把命令行直接指向源文件，不需要先 `dotnet new` 也不需要先 `dotnet build`：

```csharp
// 命令行：dotnet run hello.cs
// 无需先执行 dotnet new / dotnet build
```

当然，它也不是只能写裸代码。如果你需要引用一个 NuGet 包，或者声明用哪个 SDK，可以用文件顶部的 `#` 指令来做，比如拉一个 Humanizer：

```csharp
#:package Humanizer@2.*
Console.WriteLine("done".Humanize());
```

这种“文件即工程”的方式，让 C# 第一次在手感上接近 Python、Node 这类脚本语言，又保留了编译型语言的类型安全和性能。

## 反例（常见错误）

不过有几个边界得清楚，否则会踩坑。首先是顶层语句的排他性：一个文件里既然已经用顶层语句隐式声明了入口点，就不能再写 `static void Main()`，两者冲突：

```csharp
Console.WriteLine("hi");
static void Main() { }   // ❌ 与顶层语句的隐式入口冲突
```

其次是隐式 global using 的范围——它只包含那一批“最常用的”命名空间，并不是所有东西都白送。比如 `System.Text.Json` 这种，你还是得显式 `using`，或者在全局配置里加。最后，文件型应用是以“单个文件”为单位的：你把一个目录里放好几个 `.cs` 指望它们互相引用，默认是不行的，它们彼此并不自动可见。要组织更大的代码，还是回到正经的项目文件更合适。

## 适用版本

=== "net10"
    支持 `dotnet run app.cs` 直接运行单文件应用，配合隐式 global using 与 `#` 指令。

=== "net8"
    支持顶层语句与隐式 global using，但仍需项目文件，`dotnet run` 不能直接运行裸 `.cs`。

## 参考资料

- 相关：[.NET 10 主题地图](../overview.md)
- 官方文档：[File-based apps (.NET)](https://learn.microsoft.com/dotnet/core/sdk/file-based-apps)
