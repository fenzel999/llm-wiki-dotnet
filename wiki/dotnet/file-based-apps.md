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

## 概述

文件型应用（file-based apps）指不需要 `.csproj` 项目文件、直接用 `dotnet run app.cs` 即可运行的单个 C# 源文件。配合 top-level statements（顶层语句）与 implicit global usings（隐式全局 using），最简单的程序可以完全省略 `using` 指令与 `Main` 方法样板，非常适合脚本、教学与快速原型。它是 .NET 10 对“轻量运行 C#”体验的整合。

## 正确做法

一个完整可运行的 `hello.cs` 只需一行：

```csharp
Console.WriteLine("hi");
```

由于 SDK 默认启用隐式 global using（包含 `System`、`System.Linq`、`System.Collections.Generic` 等），无需任何 `using` 也能编译：

```csharp
var names = new[] { "Ada", "Alan", "Grace" };
foreach (var n in names.Where(x => x.Length <= 3))
    Console.WriteLine(n);
```

运行方式是在命令行直接指向源文件，无需先 `dotnet new` 或 `dotnet build`：

```csharp
// 命令行：dotnet run hello.cs
// 无需先执行 dotnet new / dotnet build
```

需要引用 NuGet 包或指定 SDK 时，可在文件顶部用指令声明：

```csharp
#:package Humanizer@2.*
Console.WriteLine("done".Humanize());
```

## 反例（常见错误）

- ❌ 在同一文件里既写顶层语句又写 `static void Main`：顶层语句已隐含入口点，二者冲突。

```csharp
Console.WriteLine("hi");
static void Main() { }   // ❌ 与顶层语句的隐式入口冲突
```

- 误以为隐式 global using 包含所有命名空间；如 `System.Text.Json` 仍需显式 `using` 或全局配置。
- 把多个文件型程序放同一目录期望互相引用：文件型应用以单文件为单位，彼此默认不互相可见。

## 适用版本

=== "net10"
    支持 `dotnet run app.cs` 直接运行单文件应用，配合隐式 global using 与 `#` 指令。

=== "net8"
    支持顶层语句与隐式 global using，但仍需项目文件，`dotnet run` 不能直接运行裸 `.cs`。

## 参考资料

- 相关：[.NET 10 主题地图](overview.md)
- 官方文档：[File-based apps (.NET)](https://learn.microsoft.com/dotnet/core/sdk/file-based-apps)
