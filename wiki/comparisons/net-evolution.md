---
title: .NET 版本演进
summary: .NET 6/8/10 为 LTS，.NET 9 为 STS；按主题优先+版本元数据组织内容，对齐 C# 12/13/14。
tags: [comparison, dotnet, version, lts, csharp]
introduced-in: general
applies-to: [all]
status: stable
source: https://learn.microsoft.com/dotnet/core/whats-new/dotnet-10
updated: 2026-07-10
---

## 概述

.NET 采用“LTS / STS”双轨发布：LTS（long-term support，长期支持）提供约 3 年补丁，STS（standard-term support，标准支持）仅约 18 个月。生产项目应优先选 LTS（.NET 8 / .NET 10），避免 STS 的短支持窗口。C# 语言版本与运行时绑定：.NET 8 → C# 12、.NET 9 → C# 13、.NET 10 → C# 14。本知识库的内容组织遵循“主题优先、版本元数据后置”——页面以技术主题组织，版本差异通过 frontmatter 的 `introduced-in` 与正文 `===` 选项卡表达，而非按版本拆页，从而避免版本碎片化、保证单一主题一处维护。

## 取舍对比

**发布时间线与支持类型**

| 版本 | 发布时间 | 支持类型 | 支持截止 | 对应 C# |
|------|----------|----------|----------|---------|
| .NET 6 | 2021-11 | LTS | 2024-11 | C# 10 |
| .NET 7 | 2022-11 | STS | 2024-05 | C# 11 |
| .NET 8 | 2023-11 | LTS | 2026-11 | C# 12 |
| .NET 9 | 2024-11 | STS | 2026-05 | C# 13 |
| .NET 10 | 2025-11-11 | LTS | 2028-11-14 | C# 14 |

**C# 语言版本关键特性（示意）**

| C# | 关键特性（示意） | 对应运行时 |
|----|------------------|------------|
| C# 12 | 主构造器、集合表达式、`inline` 数组 | .NET 8 |
| C# 13 | `params` 集合、`ref` 改进、`\e` 转义 | .NET 9 |
| C# 14 | `field` 关键字、扩展成员(`extension`)、更简 nameof | .NET 10 |

**特性矩阵（net8 / net9 / net10）**

| 能力 | .NET 8 (LTS) | .NET 9 (STS) | .NET 10 (LTS) |
|------|--------------|--------------|---------------|
| C# 版本 | 12 | 13 | 14 |
| 集合表达式 / 主构造函数 | ✅ | ✅ | ✅ |
| `params` 集合 (C# 13) | ❌ | ✅ | ✅ |
| 内建 OpenAPI 生成 | ❌（需第三方库） | ✅ 3.0 | ✅ 3.1 |
| 最小 API 内建验证 | ❌（需第三方库/手写） | ❌ | ✅ |
| `field` 关键字 / `extension` 块 | ❌ | ❌ | ✅ |
| `Microsoft.Extensions.AI` | ❌ | ✅ | ✅ |
| 原生 AOT（限制程度） | 多限制 | 较少 | 更少 |
| EF Core 复杂类型 / 基元集合 | ✅（复杂类型） | ✅ | ✅ |

主题优先的组织方式在实践中这样落地——无论版本都先给推荐写法，再用选项卡表达版本差异：

```csharp
// 主题优先：无论版本都先给推荐写法
public record Person(string Name, int Age);   // record 值语义

// 版本元数据：C# 14 引入的 field 关键字（.NET 10）
public class Order
{
    public decimal Total { get => field; set => field = value < 0 ? 0 : value; }
}

// 选项卡（mkdocs-material 语法）表达版本差异
// === "net10"
// public extension StringExtensions for string { ... }   // C# 14 extension 块
// === "net9"
// 旧写法：静态扩展类 static class StringExtensions { ... }
```

## 结论与建议

新建生产项目优先选 **.NET 8 / .NET 10（LTS）**；需要最新语言特性（如 `field` 关键字、`extension` 块）则必须上 **.NET 10 / C# 14**。阅读本库时，遇到跨版本差异请直接看各页的 `===` 选项卡，不要在正文里含糊理解“新版改了什么”。更细的版本特性与示例见 [.NET 8 / C# 12](../dotnet/versions/net8.md) 与 [.NET 9 / C# 13](../dotnet/versions/net9.md)。

## 参考资料

- 相关：[.NET 8 / C# 12](../dotnet/versions/net8.md)
- 相关：[.NET 9 / C# 13](../dotnet/versions/net9.md)
- 相关：[持久约定 POLICY](../governance/policy.md)
- 相关：[record 与 class 对比](record-vs-class.md)
- 相关：[RAG 与 LLM Wiki 对比](rag-vs-llm-wiki.md)
- 相关：[List 与 ImmutableArray 对比](list-vs-immutablearray.md)
- 官方文档：[What's new in .NET 10](https://learn.microsoft.com/dotnet/core/whats-new/dotnet-10)
