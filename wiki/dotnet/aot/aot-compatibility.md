---
title: Native AOT 兼容性矩阵与规则
summary: 后端严格 AOT 的落地清单——哪些特性支持/部分/不支持，以及反射、JSON、DI、EF Core 的 AOT 写法。
tags: [native-aot, trimming, source-generators, backend]
introduced-in: net8
applies-to: [net8, net9, net10]
status: stable
source: https://learn.microsoft.com/aspnet/core/fundamentals/native-aot
updated: 2026-07-10
---

# Native AOT 兼容性矩阵与规则

> **要点速览**
> - 本库**后端代码必须兼容 Native AOT**（[P16](../../governance/policy.md)）；前端（Blazor）豁免。
> - AOT 会**裁剪未用代码**，所以**运行期反射会失效**——凡是反射的地方改用**源生成**（JSON / 日志 / 配置绑定）。
> - Web 用 **Minimal API**（支持），不用 **MVC/控制器**（不支持）；认证优先 **JWT Bearer**（支持），cookie/OIDC 不支持。
> - **EF Core 部分支持**：AOT 发布需**编译模型 + 预编译查询**。
> - 每个后端主题页都应有 `### Native AOT 兼容性` 小节，并链接本页。

## 概述

Native AOT 在**发布时**把 IL 提前编译成本机代码，运行时没有 JIT，也**裁剪掉未被静态分析到的代码**。这带来更快启动、更小体积、更低内存，但代价是：**任何依赖运行期反射、动态代码生成、运行期程序集扫描的写法都会失效或报裁剪警告**。因此"AOT 友好"本质上等于"编译期可确定"——把反射换成**源生成器**（source generator）在编译期产出等价代码。

本库约定**后端严格 AOT**（[P16](../../governance/policy.md)）：API、应用服务、领域、基础设施、后台服务都要能在 `PublishAot=true` 下无警告发布。前端 Blazor 不在此列（Blazor Server 不支持 AOT，WASM 另有 AOT 路径）。

## 正确做法

### ASP.NET Core 特性兼容性（官方）

| 特性 | AOT 支持 | 本库处置 |
|------|:--------:|----------|
| Minimal APIs | 🟡 部分（源生成） | ✅ 默认用它 |
| gRPC / HealthChecks / HttpLogging | ✅ | 可用 |
| **JWT 认证** | ✅ | ✅ 后端认证首选 |
| 限流 / 输出缓存 / 响应缓存 / 响应压缩 | ✅ | 可用 |
| 本地化 / 重写 / 静态文件 / WebSockets / CORS | ✅ | 可用 |
| **SignalR** | 🟡 部分 | 谨慎，标注限制 |
| **Blazor Server** | ❌ | 前端豁免（另说明） |
| **MVC / 控制器** | ❌ | 禁用（[P16](../../governance/policy.md)） |
| **其它认证（cookie / OpenID Connect）** | ❌ | 后端避免；用 JWT 替代 |
| Session / SPA / OData | ❌ | 避免 |

### 把反射换成源生成

AOT 下最常见的坑是**反射式序列化/绑定**。逐项替换：

- **JSON**：用 `System.Text.Json` **源生成**（`[JsonSerializable]` + `JsonSerializerContext`），不用反射序列化。见[序列化](../csharp/serialization.md)。
- **日志**：用 `[LoggerMessage]` **源生成**的高性能日志，不用反射拼参数。见[可观测性](../fundamentals/observability.md)。
- **配置绑定**：启用 `EnableConfigurationBindingGenerator`，用配置绑定源生成器，避免 `Bind` 的运行期反射。见[配置与 Options](../fundamentals/configuration-options.md)。
- **DI**：**显式注册**，不做运行期程序集扫描 / 约定装配。见[依赖注入](../fundamentals/dependency-injection.md)。

```xml
<!-- 项目开启 AOT 与相关源生成 -->
<PropertyGroup>
  <PublishAot>true</PublishAot>
  <EnableConfigurationBindingGenerator>true</EnableConfigurationBindingGenerator>
</PropertyGroup>
```

### EF Core 在 AOT 下的写法

EF Core 查询管道历史上重度依赖运行期表达式编译，故**仅部分支持 AOT**。AOT 发布需要：

- **编译模型**：`dotnet ef dbcontext optimize` 预生成模型，避免运行期用反射构建。
- **预编译查询**（net9+ 引入、net10 完善）：把 LINQ 查询在编译期转成拦截器代码。
- 应用侧查询逻辑本身**不要靠反射**（如[动态排序用编译期表达式白名单](../ef-core/pagination.md)，不按字符串反射属性名）。

### 验证

发布并检查：AOT 发布若产生裁剪/AOT 警告，运行时很可能出错，必须清零。

```bash
dotnet publish -c Release   # 项目已设 PublishAot=true
# 关注输出里的 "AOT analysis warning" / "Trim analysis warning"，逐条消除
```

首次请求要**打通每个端点**——典型故障是"编译通过、启动正常、首个请求 500"，因为某返回类型没进 JSON 源生成上下文。

## 常见误区

❌ **在 AOT 后端用 MVC/控制器或 cookie/OIDC 认证**。它们不支持 AOT。用 Minimal API + JWT Bearer（[P16](../../governance/policy.md)）。

❌ **用反射式 `JsonSerializer.Serialize(obj)`（无上下文）**。AOT 下类型元数据被裁剪，运行时抛异常。始终走 `JsonSerializerContext`。

❌ **DI 里做运行期程序集扫描**（"自动注册所有 `IService`"）。扫描依赖反射，AOT 不可靠。显式注册每个服务。

❌ **忽略发布时的 AOT/裁剪警告**。警告就是运行期故障的预告，必须清零后再上线。

❌ **EF Core 直接 AOT 发布却不生成编译模型/预编译查询**。会报警告或运行期失败。按上文启用。

## 适用版本

ASP.NET Core Native AOT 支持自 **net8** 引入，net9/net10 覆盖面持续扩大（EF Core 预编译查询 net9+）。上表为官方 net10 兼容性快照。

## 参考资料

- [原生 AOT（编译与部署）](native-aot.md) · [源生成器实战](../csharp/source-generators.md) · [序列化（JSON 源生成）](../csharp/serialization.md)
- [持久约定 P16（后端严格 AOT）](../../governance/policy.md)
- 官方文档：[ASP.NET Core 对 Native AOT 的支持](https://learn.microsoft.com/aspnet/core/fundamentals/native-aot) · [Native AOT 部署概述](https://learn.microsoft.com/dotnet/core/deploying/native-aot)
