---
title: 源生成器实战（Source Generators）
summary: 编译期生成代码替代运行时反射，用增量生成器（IIncrementalGenerator）实现零反射、AOT 友好。
tags: [source-generator, roslyn, incremental, native-aot]
introduced-in: net5
applies-to: [net6, net7, net8, net9, net10]
status: stable
source: https://learn.microsoft.com/dotnet/csharp/roslyn-sdk/source-generators-overview
updated: 2026-07-10
---

> **要点速览**
> - 编译期生成代码**替代运行时反射**，AOT/裁剪友好；框架已用于 JSON/Logging/Regex/P-Invoke。
> - 日常先**用**官方生成器（`LoggerMessage`/`GeneratedRegex`/JSON 源生成）。
> - 自己写用**增量生成器**（`IIncrementalGenerator`）；旧 `ISourceGenerator` 卡 IDE，已被取代。
> - 管道里只传轻量可比较的数据模型，别传 `ISymbol`/`Compilation`（破坏缓存）。

## 概述

源生成器（Source Generator）是 Roslyn 编译器的扩展点：它在**编译期**分析你的代码，再**生成新的 C# 源码**一起参与编译。它的最大价值是用编译期代码生成**替代运行时反射**——反射慢、且在 Native AOT/裁剪下不可靠，而生成的代码是静态的、可被 AOT 完整编译。.NET 自己就大量使用它：`System.Text.Json` 源生成、`LoggerMessage`、`GeneratedRegex`、`LibraryImport`（P/Invoke）都是源生成器产物，是对应运行时反射写法的**现代替代**。

写生成器要用**增量生成器（`IIncrementalGenerator`）**——这是当前推荐做法，旧的 `ISourceGenerator` 因每次按键都全量重跑、拖慢 IDE，**已被增量生成器取代**（[P11](../../governance/policy.md)）。增量生成器基于"管道 + 缓存"，只在相关输入变化时重算，IDE 体验流畅。

## 正确做法

日常先**用**框架自带的源生成器（零反射、AOT 友好），这是绝大多数人需要的：

```csharp
public partial class Log
{
    [LoggerMessage(Level = LogLevel.Warning, Message = "Retry {Attempt} for {Url}")]
    public static partial void Retry(ILogger logger, int attempt, string url);   // 编译期生成，零分配
}

[GeneratedRegex(@"^\d{4}-\d{2}-\d{2}$")]
private static partial Regex DateRegex();                                         // 编译期生成，非运行时构造
```

自己**写**生成器时，用增量生成器骨架：

```csharp
[Generator]
public class MyGenerator : IIncrementalGenerator
{
    public void Initialize(IncrementalGeneratorInitializationContext context)
    {
        var models = context.SyntaxProvider
            .ForAttributeWithMetadataName("MyLib.GenerateAttribute",
                predicate: static (_, _) => true,
                transform: static (ctx, _) => Extract(ctx))       // 只提取所需数据，利于缓存
            .Where(static m => m is not null);

        context.RegisterSourceOutput(models, static (spc, model) =>
            spc.AddSource($"{model!.Name}.g.cs", Emit(model)));
    }
}
```

## 常见误区

❌ 新写生成器还用旧的 `ISourceGenerator`。它每次编辑全量重跑、卡 IDE，已被 `IIncrementalGenerator` 取代。

❌ 在生成器管道里直接传递 `ISymbol`/`Compilation` 等重对象，破坏增量缓存导致每次重算。只提取轻量、可比较的数据模型（record/值类型）往下传。

❌ 明明有框架自带生成器（JSON、Regex、Logging、P/Invoke）却仍用运行时反射写法，尤其在 AOT 下会出问题。优先用官方生成器。

## 适用版本

源生成器 net5+；增量生成器（`IIncrementalGenerator`）net6+ 起为推荐方式；`GeneratedRegex` net7+，`LibraryImport` net7+。

## 参考资料

- [C# 现代语言特性（源生成器概述）](modern-csharp.md#source-generators)
- [JSON 序列化（源生成）](serialization.md)
- [原生 AOT](../aot/native-aot.md)
- 官方文档：[源生成器概述](https://learn.microsoft.com/dotnet/csharp/roslyn-sdk/source-generators-overview)
- 官方文档：[增量生成器](https://learn.microsoft.com/dotnet/csharp/roslyn-sdk/source-generators-overview#incremental-generators)
