---
title: .NET Aspire（本地编排与可观测性）
summary: 部署与编排层——用 C# AppHost 编排多服务本地开发，统一注入配置/发现/遥测，自带仪表盘；开源免费、不绑定云；与架构正交。
tags: [aspire, cloud-native, orchestration, observability]
introduced-in: net8
applies-to: [net8, net9, net10]
status: stable
source: https://learn.microsoft.com/dotnet/aspire/
updated: 2026-07-11
---

# .NET Aspire（本地编排与可观测性）

> **要点速览**
> - **定位**：Aspire 属于**部署与编排（Deployment）**层（见[三种架构不在同一层级](../architecture/solution-structure.md#arch-levels)）——它管"怎么把多个服务/依赖一起跑起来、连好线、看清状态"，**不管**你的代码内部怎么分层（整洁架构）、也不管你是一个单体还是微服务。
> - 用 C# **AppHost** 声明式编排多服务本地开发，自动注入连接串/服务发现/遥测，自带仪表盘。
> - **开源免费、不绑定付费云**（[P12](../governance/policy.md)）；产物可部署到任意容器平台。
> - 依赖用 `WithReference` 串联；各服务 `AddServiceDefaults()` 共享遥测/健康检查。
> - 它是开发内环 + 部署清单工具，**不是生产运行时**。

## 概述

当一个应用由多个部分组成（Web API + 后台 Worker + 数据库 + 缓存），本地把它们一起跑起来、连好线、看清各自状态，一直很麻烦。**.NET Aspire** 就是来解决这个"云原生开发体验"问题的：你用一个 C# 写的 **AppHost** 项目声明式地描述有哪些服务、谁依赖谁，Aspire 负责本地编排启动、自动注入连接字符串与服务发现、统一配置 OpenTelemetry，并提供一个开箱即用的 **仪表盘（Dashboard）**看日志/追踪/指标。

Aspire 由两个关键部分构成：

| 部分 | 作用 |
|------|------|
| **AppHost** | 编排项目：声明资源（项目、容器、数据库）、依赖关系，本地拉起整套环境并生成部署清单 |
| **ServiceDefaults** | 一个共享项目：用 `AddServiceDefaults()` 给每个服务统一注入健康检查、OTel 遥测、服务发现、弹性默认 |

> 关键认知（与架构分层正交）：Aspire 与[模块化单体](../architecture/modular-monolith.md)或[微服务](../architecture/microservices.md)天然协作——不论你拆不拆服务，只要有多"个可独立启动的单元"（项目/容器），就能用 AppHost 编排。它不决定、也不关心内部是整洁架构还是别的（见 [解决方案分层](../architecture/solution-structure.md)）。

## 正确做法

### 1. 在 AppHost 里用 C# 声明拓扑

```csharp
var builder = DistributedApplication.CreateBuilder(args);

var cache = builder.AddRedis("cache");                    // 本地容器化依赖
var db    = builder.AddPostgres("pg").AddDatabase("orders");

builder.AddProject<Projects.Api>("api")
       .WithReference(cache)                              // 自动注入连接信息 + 服务发现
       .WithReference(db);

builder.Build().Run();
```

`WithReference` 会把连接信息作为环境变量/配置注入到目标服务，无需手写连接串；服务发现让 `api` 通过名字 `cache`/`pg` 寻址。

### 2. 每个服务一行接入共享默认

```csharp
// 各服务 Program.cs 顶部
builder.AddServiceDefaults();   // 统一：健康检查、OTel 导出、服务发现、弹性
```

### 3. 与 AOT 后端协作

若某个服务启用了 Native AOT（见 [AOT 矩阵](../dotnet/aot/aot-compatibility.md)），它仍能作为 AppHost 里的一个 `AddProject` 被编排——Aspire 编排的是**进程/容器**，与是否 AOT 无关。注意 AOT 服务走 Minimal API + JWT Bearer（见 [auth](../dotnet/aspnet-core/auth.md)）。

## 常见误区

❌ **以为 Aspire = 必须上某个付费云**。它是本地编排 + 可观测性工具，产物可部署到任意容器平台，不绑定付费服务（[P12](../governance/policy.md)）。

❌ **手动在每个服务里重复配置连接串、遥测、健康检查**。用 `WithReference` 自动注入 + `AddServiceDefaults` 共享，别重复劳动。

❌ **把 Aspire 当成生产运行时**。它主要服务于开发内环与部署清单生成；生产由目标容器编排平台（K8s 等）运行 AppHost 生成的清单。

❌ **把 Aspire 当成"架构模式"**，和整洁架构/微服务并列讨论。它是部署层工具，与前两者正交（见[三种架构不在同一层级](../architecture/solution-structure.md#arch-levels)）。

## 适用版本

.NET Aspire 面向 net8+，随 net9/net10 持续增强；需安装 Aspire 工作负载/模板。

### Native AOT 兼容性

Aspire 本身**不影响** AOT：它编排的是进程/容器。被编排的服务若启用 AOT，遵循[后端 AOT 约束](../dotnet/aot/aot-compatibility.md)（Minimal API、显式 DI、JSON 源生成）即可。

## 参考资料

- [容器化](containers.md) · [健康检查](health-checks.md) · [日志与可观测性](../dotnet/fundamentals/observability.md)
- [三种架构不在同一层级（部署层正交）](../architecture/solution-structure.md) · [AOT 兼容性矩阵](../dotnet/aot/aot-compatibility.md)
- 官方文档：[.NET Aspire 概述](https://learn.microsoft.com/dotnet/aspire/)
