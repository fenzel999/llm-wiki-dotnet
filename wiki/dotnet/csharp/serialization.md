---
title: JSON 序列化（System.Text.Json）
summary: 用内置 System.Text.Json 高性能序列化；反射式 vs 源生成对比；AOT 必须用源生成器（JsonSerializerContext）实现零反射。
tags: [json, serialization, system-text-json, source-generator, native-aot]
introduced-in: netcore3
applies-to: [net8, net9, net10]
status: stable
source: https://learn.microsoft.com/dotnet/standard/serialization/system-text-json/
updated: 2026-07-11
---

# JSON 序列化（System.Text.Json）

> **要点速览**
> - 用内置 `System.Text.Json`；`Newtonsoft.Json` 是第三方且通用功能已被取代（[POLICY P10/P11](../../governance/policy.md)）。
> - `JsonSerializerOptions` 线程安全，定义 `static readonly` 复用，别每次新建。
> - **AOT / 裁剪场景必须用源生成器**（`JsonSerializerContext`），否则运行期反射失败。
> - 命名策略：前端 camelCase 用 `JsonSerializerDefaults.Web`。

## 概述

.NET 的官方 JSON 库是内置的 **`System.Text.Json`**，默认高性能、低分配，构建在 `Span`/`Utf8` 之上。`Newtonsoft.Json` 是第三方库，通用能力**已被取代**——新代码一律用内置库；仅当它尚不支持的边角特性无法手写时再另行评估。

序列化入口是静态类 `JsonSerializer`。默认大小写敏感、按 C# 原名输出（可配 `CamelCase`）。对性能/AOT 敏感的场景用 **源生成器（`JsonSerializerContext`）**，编译期生成序列化代码，避免运行期反射——这也是 Native AOT 的前提。

## 反射式 vs 源生成

| 方式 | 机制 | 适用 | AOT |
|------|------|------|-----|
| 反射式 `Serialize(obj, options)` | 运行期反射读属性 | 普通 JIT 应用、快速起步 | ❌ 不支持 |
| 源生成 `JsonSerializerContext` | 编译期生成代码 | 热路径、库、AOT/裁剪 | ✅ 必需 |

## 正确做法

### 1. 常规：复用 options

```csharp
static readonly JsonSerializerOptions Options = new(JsonSerializerDefaults.Web);

string json = JsonSerializer.Serialize(order, Options);
Order? back = JsonSerializer.Deserialize<Order>(json, Options);
```

### 2. AOT / 热路径：源生成器上下文

```csharp
[JsonSerializable(typeof(Order))]
[JsonSerializable(typeof(OrderDto))]
public partial class AppJsonContext : JsonSerializerContext { }

string json = JsonSerializer.Serialize(order, AppJsonContext.Default.Order);
```

在 ASP.NET Core 中让 Minimal API 用该上下文（实现 `JsonSerializerContext` 的类型传给 `AddJsonOptions` 或直接标注）：

```csharp
builder.Services.AddControllers().AddJsonOptions(o => o.JsonSerializerOptions.TypeInfoResolver = AppJsonContext.Default);
```

### 3. 何时用哪种？决策表

| 场景 | 用 |
|------|----|
| 普通 JIT 后端/工具 | 反射式 + 复用 options |
| 库（被别人引用） | 源生成（不替调用方决定反射策略） |
| Native AOT / 裁剪发布 | 源生成（强制） |
| 高频序列化热路径 | 源生成（避免反射缓存开销） |

## 常见误区

❌ **每次调用都 `new JsonSerializerOptions()`**。构造涉及内部缓存预热，反复新建既慢又浪费；定义 `static readonly` 复用。

❌ **新项目默认引 `Newtonsoft.Json`**。第三方且通用功能已被内置取代；用 `System.Text.Json`。

❌ **AOT / 裁剪场景用默认反射式序列化**，运行期报类型缺失。必须用源生成器上下文（见 [AOT 矩阵](../../dotnet/aot/aot-compatibility.md)）。

❌ **忽略命名策略**：前端要 camelCase 却用默认原名，字段对不上。用 `JsonSerializerDefaults.Web` 或显式 `PropertyNamingPolicy`。

## 适用版本

`System.Text.Json` 自 netcoreapp3.0 内置；源生成器 net6+；net8/net9 持续补齐多态、必需成员、扩展能力。

### Native AOT 兼容性

序列化是 **AOT 的头号坑**：反射式 `JsonSerializer` 在裁剪/AOT 下因类型信息被裁掉而失败。 remedy 是**源生成器**——编译期产出 `JsonTypeInfo`，零运行期反射（✅，[AOT 矩阵](../aot/aot-compatibility.md)）。本库后端 JSON 一律走源生成（[P16](../../governance/policy.md)）。

## 参考资料

- [C# 源生成器](modern-csharp.md#source-generators) · [原生 AOT](../aot/native-aot.md)
- [AOT 兼容性矩阵](../aot/aot-compatibility.md) · [持久约定 POLICY](../../governance/policy.md)
- 官方文档：[System.Text.Json 概述](https://learn.microsoft.com/dotnet/standard/serialization/system-text-json/) · [JSON 源生成](https://learn.microsoft.com/dotnet/standard/serialization/system-text-json/source-generation)
