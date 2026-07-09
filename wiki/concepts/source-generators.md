---
title: 源生成器(Source Generators)
summary: 在编译期生成代码，减少反射与样板，并提升 AOT 兼容性与启动性能。
tags: [source-generators, 编译期, aot, 代码生成]
introduced-in: net10
applies-to: [all]
status: stable
source: https://learn.microsoft.com/dotnet/csharp/roslyn-sdk/source-generators-overview
updated: 2026-07-09
---

## 概述

源生成器(Source Generators)是 Roslyn 编译器扩展，在编译期分析代码并生成新的 C# 源码加入编译。相比运行时反射，它零运行时开销，并与 AOT(Ahead-Of-Time)编译友好。增量生成器(incremental generator)通过 `IIncrementalGenerator` 实现缓存，避免重复工作。

## 正确做法

```csharp
using Microsoft.CodeAnalysis;
using Microsoft.CodeAnalysis.Text;
using System.Text;

[Generator]
public class HelloGenerator : IIncrementalGenerator
{
    public void Initialize(IncrementalGeneratorInitializationContext ctx)
    {
        ctx.RegisterSourceOutput(ctx.CompilationProvider, (spc, compilation) =>
        {
            var src = "namespace Gen { public static class Hi { public const string M = \"hi\"; } }";
            spc.AddSource("Hi.g.cs", SourceText.From(src, Encoding.UTF8));
        });
    }
}
```

## 常见误区

- 使用旧的 `ISourceGenerator` 而非增量生成器，导致重编译缓慢。
- 在生成器中执行耗时/IO 操作，拖慢整个编译。
- 误以为源生成器能替代运行时反射的全部场景，复杂动态行为仍需反射。

## 参考资料

- [依赖注入](../concepts/dependency-injection.md)
- [泛型](../concepts/generics.md)
