---
title: .NET 9 / C# 13 关键知识
summary: .NET 9（STS）与 C# 13 的主要特性，作为本库多版本知识的一部分。
tags: [dotnet, net9, csharp13]
introduced-in: net9
applies-to: [net9, net10]
status: stable
source: sources/README.md
updated: 2026-07-09
---

# .NET 9 / C# 13 关键知识

.NET 9 于 2024-11 发布（**STS**，支持到 2026-05）。对应 **C# 13**。本页汇总其关键能力；
与 .NET 8 / .NET 10 的差异见 [.NET 版本演进](../../comparisons/net-evolution.md)。

## C# 13 语言特性

- **params 集合**：`params ReadOnlySpan<T>` / `params IEnumerable<T>`，可接收任意集合/栈上 span，零分配友好。
- **新 `System.Threading.Lock`**：`Lock` 类型替代 `lock(obj)`，性能与可观测性更好。
- **params 与 ref 细化**、转义序列与重载优先级改进。

```csharp
void Log(params ReadOnlySpan<string> parts)
{
    foreach (var p in parts) Console.Write(p);
}

Log("a", "b", "c");                 // 栈上，无需数组分配
ReadOnlySpan<string> s = ["x", "y"];
Log(s);                            // 直接传 Span
```

## ASP.NET Core 9

- **内建 OpenAPI 生成器**：`Microsoft.AspNetCore.OpenApi` 的 `AddOpenApi()` 从 .NET 9 起可用，
   生成 **OpenAPI 3.0**（[原生 OpenAPI 3.1](../aspnet-core/openapi-3-1.md) 在 .NET 10 升级到 3.1）。
- 静态资源缓存、计时器与各项性能改进；原生 AOT 限制较 net8 减少。

## .NET 9 平台能力

- **Microsoft.Extensions.AI**：统一的 AI/LLM 抽象（IChatClient、IEmbeddingGenerator、工具调用），
  便于接入多种模型；这是 .NET 9 的标志性能力。
- **HybridCache**：分布式 + 内存双层缓存抽象。
- `Base64Url`、`OrderedDictionary<TKey,TValue>`、`TensorPrimitives` 等基础库增强。
- EF Core 9、AOT/trimming 持续改进。

## 适用版本

=== "net9"
    上述 C# 13 / Microsoft.Extensions.AI / HybridCache 等可用。
=== "net10"
    全部向下兼容，并叠加 [.NET 10](../overview.md) 新特性（如 `field` 关键字、内建验证、OpenAPI 3.1）。
