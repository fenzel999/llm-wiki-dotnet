---
title: .NET 7 / C# 11 关键知识
summary: 性能与 AOT 之版——Native AOT（控制台）、C# 11 泛型数学/原始字符串/必需成员、限流与输出缓存、发布到容器、EF Core 7 JSON 列与批量更新。已 EOL，保留仍然有效的知识。
tags: [dotnet, net7, csharp11]
introduced-in: net7
applies-to: [net7]
status: deprecated
source: https://learn.microsoft.com/dotnet/core/whats-new/dotnet-7
updated: 2026-07-10
---

## 概述

.NET 7 在 2022 年 11 月发布，是一个 **STS** 版本（支持已于 2024 年 5 月结束，现已 **EOL**）。它的关键词是**快**：OSR（栈上替换）、PGO 更易开启、Arm64 代码生成改进，以及最受关注的——**Native AOT** 首次面向控制台应用落地。语言侧 **C# 11** 也补上了泛型数学、原始字符串字面量、必需成员等几块拼图。

版本虽已 EOL，但 Native AOT、限流中间件、EF Core 的批量更新等，在 .NET 10 里都是仍在推荐的能力。它对应 **C# 11**。逐版差异见[.NET 版本演进](../../comparisons/net-evolution.md)。

## C# 11 语言特性

- **原始字符串字面量（raw string literals）**：用 `"""` 包裹，多行、含引号/反斜杠的文本（JSON、正则、SQL）无需转义。
- **必需成员（`required`）**：强制对象初始化时必须给某属性赋值，配合 `System.Text.Json` 的必需属性校验。
- **泛型数学（generic math）**：借助 `static abstract` 接口成员，可以写一个适用于所有"数值类型"的通用算法，不必为每种类型重载。
- **列表模式（list patterns）**、**文件级类型（`file`）**、**UTF-8 字符串字面量（`"..."u8`）**。

```csharp
string json = """
    { "name": "Ann", "age": 30 }
    """;                                    // 原始字符串，无需转义

public class Order
{
    public required string Id { get; init; } // 必需成员
}

// 泛型数学：一个方法适配所有数值类型
static T Sum<T>(IEnumerable<T> xs) where T : INumber<T>
{
    T total = T.Zero;
    foreach (var x in xs) total += x;
    return total;
}
```

## 关键平台特性

- **Native AOT（控制台）**：`dotnet publish` 产出无 IL、无 JIT 的原生自包含可执行文件，启动快、体积小（.NET 7 阶段聚焦控制台且要求裁剪）。这条线在后续版本持续放宽限制，详见[原生 AOT](../aot/native-aot.md)。
- **正则源生成器 + `NonBacktracking`**：`[GeneratedRegex]` 在编译期为你的模式生成优化引擎；`RegexOptions.NonBacktracking` 保证线性时间匹配。
- **限流中间件（rate limiting）**：`System.Threading.RateLimiting` + ASP.NET Core 7 内置限流，保护资源不被打爆；同期还有**输出缓存（output caching）**、gRPC JSON 转码。
- **发布到容器**：`dotnet publish` 可直接产出容器镜像，无需手写 Dockerfile。
- **中央包管理（CPM）**：仓库根放一个 `Directory.Packages.props`，用 `PackageVersion` 统一管理依赖版本，各项目 `PackageReference` 不再各写版本号。
- **P/Invoke 源生成（`LibraryImport`）**：**旧写法运行时生成封送代码的 `DllImport` 已被编译期源生成的 `LibraryImport` 取代**（对 AOT 友好）。
- `System.Text.Json` 多态序列化、必需成员、契约自定义。

### EF Core 7

- **JSON 列**（provider 无关的映射）、**保存性能**改进、自定义反向工程模板。
- **`ExecuteUpdate` / `ExecuteDelete`**：批量改/删直接翻译成一条 SQL，不用先查询再逐条改。见[EF Core 数据访问](../ef-core/ef-data-access.md)。

## 适用版本

=== "net7（EOL）"
    C# 11、Native AOT（控制台）、限流、EF Core 7 批量更新等可用；该 STS 已停止支持，**不应用于新项目**。

=== "net10（当前推荐）"
    上述能力全部保留并增强：Native AOT 限制更少、限流/输出缓存持续完善、EF Core 继续演进。新项目请直接用 [.NET 10](../overview.md)。

## 参考资料

- 官方文档：[What's new in .NET 7](https://learn.microsoft.com/dotnet/core/whats-new/dotnet-7)
- 相关：[.NET 版本演进](../../comparisons/net-evolution.md)
- 相关：[原生 AOT](../aot/native-aot.md) · [EF Core 数据访问](../ef-core/ef-data-access.md)
- 相关：[.NET 6 / C# 10](net6.md) · [.NET 8 / C# 12](net8.md)
