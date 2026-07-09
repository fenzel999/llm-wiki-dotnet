---
title: 源生成器（Source Generators）
summary: 在编译期生成代码，减少反射与样板，并提升 AOT 兼容性与启动性能。
tags: [source-generators, 编译期, aot, 代码生成]
introduced-in: net5
applies-to: [all]
status: stable
source: https://learn.microsoft.com/dotnet/csharp/roslyn-sdk/source-generators-overview
updated: 2026-07-10
---

## 概述

源生成器（Source Generators）是 Roslyn 编译器扩展，它在编译期读取并分析你的代码，再生成新的 C# 源文件一并参与编译。相比运行时的反射，这种方式零运行时开销，且与 AOT（Ahead-Of-Time）编译天然兼容，因此能显著改善启动性能与体积。现代做法推荐实现 `IIncrementalGenerator`，它通过缓存输入实现增量执行，只在相关源变更时重新生成，从而把对编译速度的影响降到最低。

## 正确做法

实现 `IIncrementalGenerator` 并在 `Initialize` 中注册输出，借助 `IncrementalGeneratorInitializationContext` 拿到缓存过的输入，再调用 `AddSource` 把生成的源码写回编译。下面的示例在编译期注入一个常量类，整个过程不会在每次保存时都全量重跑：

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

## 反例（常见错误）

❌ 仍使用旧的 `ISourceGenerator` 接口，每次重编译都会全量执行 `Execute`，在大型项目里明显拖慢构建：

```csharp
❌ [Generator]
public class Old : ISourceGenerator
{
    public void Initialize(GeneratorInitializationContext c) { }
    public void Execute(GeneratorExecutionContext c) { /* 每次重编译都全量执行，缓慢 */ }
}
```

- 在生成器内部执行耗时或 IO 操作，会拖慢整个解决方案的编译。
- 误以为源生成器能替代反射的全部场景：涉及复杂动态行为时，运行时反射仍不可替代。

## 适用版本

=== "net5 / net6 之前"
    早期仅提供 `ISourceGenerator` 接口（.NET 5 引入），每次重编译都重新执行，性能与缓存能力较弱，现已不推荐用于新项目。
=== "net6+"
    提供 `IIncrementalGenerator`（.NET 6 起），支持基于缓存的增量执行，是当前推荐写法，也是绝大多数新生成器的首选。

## 参考资料

- [依赖注入](../concepts/dependency-injection.md)
- [泛型](../concepts/generics.md)
- 官方文档：[源生成器概述](https://learn.microsoft.com/dotnet/csharp/roslyn-sdk/source-generators-overview)
