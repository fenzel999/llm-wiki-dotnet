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

> **要点速览**
> - .NET 6/8/10 = LTS，.NET 9 = STS；主题优先、版本作元数据。
> - 时间线覆盖 Core 3.x→.NET 10、C# 8→14，EOL 版本已标注。
> - 用 frontmatter 的 introduced-in/applies-to/status 表达时效，不为每版建文件夹。

## 概述

挑 .NET 版本这件事，说到底是在"用新特性"和"有人兜底"之间做权衡。微软把发布节奏分成了两条轨道：**LTS**（long-term support，长期支持，大约 3 年补丁），和 **STS**（standard-term support，标准支持，只有约 18 个月）。对生产项目来说，结论其实没那么纠结——**默认选 LTS 版本（.NET 8 或 .NET 10）就够了**。STS 版本（比如 .NET 9）能让你早点用上新语言特性，但它的支持窗口短得有点尴尬，等你想升级的时候往往已经快过期了。

顺带一提，C# 语言版本是跟运行时绑定的，不是你想升就能升：.NET 8 配 C# 12，.NET 9 配 C# 13，.NET 10 配 C# 14。所以"上哪个运行时"基本也就决定了"能用哪些语法糖"。

本知识库在内容组织上花了一个小心思：我们**不按版本拆成一堆页面**，而是以技术主题来组织，版本差异用 frontmatter 里的 `introduced-in` 字段、以及正文里的 `===` 选项卡来表达。后面你会看到具体怎么落。

## 取舍对比

先看一眼时间线，心里有个谱：

| 版本 | 发布时间 | 支持类型 | 支持截止 | 对应 C# |
|------|----------|----------|----------|---------|
| .NET Core 3.0 | 2019-09 | Current | 2020-03（EOL） | C# 8 |
| .NET Core 3.1 | 2019-12 | LTS | 2022-12（EOL） | C# 8 |
| .NET 5 | 2020-11 | STS | 2022-05（EOL） | C# 9 |
| .NET 6 | 2021-11 | LTS | 2024-11（EOL） | C# 10 |
| .NET 7 | 2022-11 | STS | 2024-05（EOL） | C# 11 |
| .NET 8 | 2023-11 | LTS | 2026-11 | C# 12 |
| .NET 9 | 2024-11 | STS | 2026-05 | C# 13 |
| .NET 10 | 2025-11-11 | LTS | 2028-11-14 | C# 14 |

标了 **EOL** 的版本均已停止支持，不应用于新项目——它们的知识只作为"演进脉络"保留。当前只在两个仍受支持的 LTS（.NET 8 / .NET 10）之间选即可；中间的 .NET 9 只是个 STS 过渡。生产环境里绝大多数团队就在这两端之间选。各历史版本仍然有效的知识分别见 [.NET Core 3.0/3.1](../dotnet/versions/netcore3.md)、[.NET 5](../dotnet/versions/net5.md)、[.NET 6](../dotnet/versions/net6.md)、[.NET 7](../dotnet/versions/net7.md)。

C# 这边几个值得记的节点：

| C# | 关键特性（示意） | 对应运行时 |
|----|------------------|------------|
| C# 8 | 可空引用类型、异步流、范围/索引、`using` 声明 | .NET Core 3.x |
| C# 9 | `record`、顶层语句、模式匹配增强、目标类型 `new` | .NET 5 |
| C# 10 | `global using`、文件级命名空间、`record struct` | .NET 6 |
| C# 11 | 泛型数学、原始字符串、`required` 成员、列表模式 | .NET 7 |
| C# 12 | 主构造器、集合表达式、`inline` 数组 | .NET 8 |
| C# 13 | `params` 集合、`ref` 改进、`\e` 转义 | .NET 9 |
| C# 14 | `field` 关键字、扩展成员(`extension`)、更简 nameof | .NET 10 |

至于"该不该上新版"，把常用能力铺开看更直观。这里标的是各版本之间真正会让你纠结的差异：

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

这张表怎么读？如果你只是想写业务代码，.NET 8 就已经很能打了；真正逼着你上 .NET 10 的，通常是那几个"语言层面"的甜点——比如 C# 14 的 `field` 关键字（让你能在属性里直接指代那个幕后字段，不用再手写私有 backing field）和 `extension` 块（把扩展方法收编成更干净的一等公民语法）。原生 AOT 也值得单独说一句：它每版都在松绑，从 .NET 8 的"限制较多"到 .NET 10 的"更少限制"，如果你的项目对启动速度或部署体积敏感，版本越新踩的坑越少。

"主题优先、版本后置"在我们这套知识库里是这么落地的——先给无论哪个版本都管用的推荐写法，再用选项卡把版本差放在一边：

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

好处是：同一个主题永远只在一处维护，不会因为".NET 9 怎么写、.NET 10 怎么写"被拆成两篇彼此过期的文档。你读的时候，遇到版本差异直接看选项卡，而不是在正文里猜"新版到底改没改"。

## 结论与建议

给新项目选型就一句话：**生产环境默认 .NET 8 或 .NET 10（都是 LTS）**。除非你有非常具体的理由需要 .NET 9 上的某样东西（比如 `Microsoft.Extensions.AI` 的早起接入），否则别为了 STS 那 18 个月的支持窗口把自己架在火上烤。

至于"要不要上 .NET 10"，判断标准很朴素：你是否需要 C# 14 的新语法？具体来说，`field` 关键字和 `extension` 块是只有 .NET 10 / C# 14 才有的。如果你的团队看重代码整洁、想早点用上这些，那就上 .NET 10；如果你的代码库还跑在 .NET 8 上、短期内没有升级计划，那 C# 12 的主构造器和集合表达式也完全够写出现代化的代码了。

阅读本库时养成一个习惯：碰到跨版本的差异，直接去翻对应页面里的 `===` 选项卡，不要试图在正文里"脑补新版改了什么"。想看更细的逐项拆解，可以接着读 [.NET 8 / C# 12](../dotnet/versions/net8.md) 与 [.NET 9 / C# 13](../dotnet/versions/net9.md)。

## 参考资料

- 相关：[.NET Core 3.0/3.1 / C# 8](../dotnet/versions/netcore3.md)
- 相关：[.NET 5 / C# 9](../dotnet/versions/net5.md)
- 相关：[.NET 6 / C# 10](../dotnet/versions/net6.md)
- 相关：[.NET 7 / C# 11](../dotnet/versions/net7.md)
- 相关：[.NET 8 / C# 12](../dotnet/versions/net8.md)
- 相关：[.NET 9 / C# 13](../dotnet/versions/net9.md)
- 相关：[持久约定 POLICY](../governance/policy.md)
- 相关：[record 与 class 对比](record-vs-class.md)
- 相关：[RAG 与 LLM Wiki 对比](rag-vs-llm-wiki.md)
- 相关：[List 与 ImmutableArray 对比](list-vs-immutablearray.md)
- 官方文档：[What's new in .NET 10](https://learn.microsoft.com/dotnet/core/whats-new/dotnet-10)
