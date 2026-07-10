---
title: .NET Aspire（本地编排与可观测性）
summary: 用 C# AppHost 编排多服务本地开发，统一注入配置/发现/遥测，自带仪表盘；开源免费、不绑定云。
tags: [aspire, cloud-native, orchestration, observability]
introduced-in: net8
applies-to: [net8, net9, net10]
status: stable
source: https://learn.microsoft.com/dotnet/aspire/
updated: 2026-07-10
---

> **要点速览**
> - 用 C# AppHost 声明式编排多服务本地开发，自动注入连接串/服务发现/遥测，自带仪表盘。
> - **开源免费、不绑定付费云**；产物可部署到任意容器平台。
> - 依赖用 `WithReference` 串联；各服务 `AddServiceDefaults()` 共享遥测/健康检查。
> - 它是开发内环 + 部署清单工具，不是生产运行时。

## 概述

当一个应用由多个部分组成（Web API + 后台 Worker + 数据库 + 缓存），本地把它们一起跑起来、连好线、看清各自状态，一直很麻烦。**.NET Aspire** 就是来解决这个"云原生开发体验"问题的：你用一个 C# 写的 **AppHost** 项目声明式地描述有哪些服务、谁依赖谁，Aspire 负责本地编排启动、自动注入连接字符串与服务发现、统一配置 OpenTelemetry，并提供一个开箱即用的 **仪表盘（Dashboard）**看日志/追踪/指标。

要点：Aspire **本身开源免费、不强制任何付费云**（[P12](../governance/policy.md)）——它是本地开发编排 + 部署清单生成工具，你可以把成果部署到任意容器环境。它由一个 AppHost（编排）和 ServiceDefaults（各服务共享的遥测/健康检查默认配置）两部分构成。

## 正确做法

在 AppHost 里用 C# 声明拓扑，依赖以引用方式串联，配置自动流转：

```csharp
var builder = DistributedApplication.CreateBuilder(args);

var cache = builder.AddRedis("cache");                    // 本地容器化依赖
var db    = builder.AddPostgres("pg").AddDatabase("orders");

builder.AddProject<Projects.Api>("api")
       .WithReference(cache)                              // 自动注入连接信息 + 服务发现
       .WithReference(db);

builder.Build().Run();
```

每个服务引用 ServiceDefaults，一行获得统一的健康检查、OTel、服务发现：

```csharp
builder.AddServiceDefaults();   // 共享的可观测性 / 健康检查 / 弹性默认
```

## 常见误区

❌ 以为 Aspire = 必须上某个付费云。它是本地编排 + 可观测性工具，产物可部署到任意容器平台，不绑定付费服务。

❌ 手动在每个服务里重复配置连接字符串、遥测、健康检查。用 `WithReference` 自动注入 + `AddServiceDefaults` 共享，别重复劳动。

❌ 把 Aspire 当成生产运行时。它主要服务于开发内环与部署清单生成，生产由目标容器编排平台运行。

## 适用版本

.NET Aspire 面向 net8+，随 net9/net10 持续增强；需安装 Aspire 工作负载/模板。

## 参考资料

- [容器化](containers.md)
- [健康检查](health-checks.md)
- [日志与可观测性](../dotnet/fundamentals/observability.md)
- 官方文档：[.NET Aspire 概述](https://learn.microsoft.com/dotnet/aspire/)
