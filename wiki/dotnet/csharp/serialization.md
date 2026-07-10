---
title: JSON 序列化（System.Text.Json）
summary: 用内置 System.Text.Json 高性能序列化，配合源生成器实现零反射、AOT 友好。
tags: [json, serialization, system-text-json, source-generator, aot]
introduced-in: netcore3
applies-to: [net8, net9, net10]
status: stable
source: https://learn.microsoft.com/dotnet/standard/serialization/system-text-json/
updated: 2026-07-10
---

## 概述

.NET 的官方 JSON 库是内置的 **`System.Text.Json`**（命名空间 `System.Text.Json`）。它默认高性能、低分配，直接构建在 `Span`/`Utf8` 之上。老项目里常见的 `Newtonsoft.Json` 是第三方库，其通用能力**已被 `System.Text.Json` 取代**——新代码一律用内置库（[POLICY P10/P11](../../governance/policy.md)）；仅当遇到 `System.Text.Json` 尚不支持的边角特性且无法手写时，才需另行评估。

序列化入口是静态类 `JsonSerializer`。要点有二：默认**大小写敏感**且属性名默认按 C# 原名输出（可配 `PropertyNamingPolicy = CamelCase`）；对性能/AOT 敏感的场景用 **源生成器（`JsonSerializerContext`）**，编译期生成序列化代码，避免运行时反射，也是 Native AOT 的前提。

## 正确做法

常规序列化/反序列化，用一份复用的 `JsonSerializerOptions`（它线程安全，应缓存复用而非每次新建）：

```csharp
static readonly JsonSerializerOptions Options = new(JsonSerializerDefaults.Web);

string json = JsonSerializer.Serialize(order, Options);
Order? back = JsonSerializer.Deserialize<Order>(json, Options);
```

对热路径或 AOT，用源生成器上下文，零反射：

```csharp
[JsonSerializable(typeof(Order))]
public partial class AppJsonContext : JsonSerializerContext { }

string json = JsonSerializer.Serialize(order, AppJsonContext.Default.Order);
```

## 常见误区

❌ 每次调用都 `new JsonSerializerOptions()`。构造 options 涉及内部缓存预热，反复新建既慢又浪费。定义一个 `static readonly` 复用。

❌ 新项目仍默认引入 `Newtonsoft.Json`。它是第三方且通用功能已被内置库取代；用 `System.Text.Json`。

❌ 在 Native AOT / 裁剪场景用默认反射式序列化，运行时报类型缺失。AOT 必须用源生成器上下文。

❌ 忽略大小写/命名策略：前端要 camelCase 却用默认原名输出，导致字段对不上。用 `JsonSerializerDefaults.Web` 或显式设 `PropertyNamingPolicy`。

## 适用版本

`System.Text.Json` 自 netcoreapp3.0 起内置；源生成器 net6+；net8/net9 持续补齐多态、必需成员、扩展等能力。

## 参考资料

- [C# 现代语言特性（源生成器）](modern-csharp.md#source-generators)
- [原生 AOT](../aot/native-aot.md)
- 官方文档：[System.Text.Json 概述](https://learn.microsoft.com/dotnet/standard/serialization/system-text-json/)
- 官方文档：[JSON 源生成](https://learn.microsoft.com/dotnet/standard/serialization/system-text-json/source-generation)
