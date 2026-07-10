---
title: 健康检查（Health Checks）
summary: 用内置健康检查暴露 liveness/readiness 端点，让编排器判断实例存活与是否可接流量。
tags: [health-checks, liveness, readiness, kubernetes, 探针]
introduced-in: general
applies-to: [all]
status: stable
source: https://learn.microsoft.com/aspnet/core/host-and-deploy/health-checks
updated: 2026-07-10
---

## 概述

容器编排器（如 Kubernetes）需要一种方式来问你的应用："你还活着吗？可以给你发流量吗？"ASP.NET Core 内置的**健康检查**就是这套机制，全部在框架内（`Microsoft.Extensions.Diagnostics.HealthChecks`），无需第三方包。

关键是分清两种探针：**存活探针（liveness）**回答"进程是否还健康"——不健康就重启它；**就绪探针（readiness）**回答"是否准备好接收流量"——比如启动预热未完、或依赖（数据库）暂不可用时应报未就绪，让编排器暂时别转发请求，但**不**重启。用 tag 给检查分组，就能把这两类映射到不同端点。

## 正确做法

注册带 tag 的健康检查，映射出 liveness 与 readiness 两个端点：

```csharp
builder.Services.AddHealthChecks()
    .AddCheck("self", () => HealthCheckResult.Healthy(), tags: ["live"])
    .AddDbContextCheck<AppDbContext>(tags: ["ready"]);    // 依赖就绪性

var app = builder.Build();

app.MapHealthChecks("/health/live",  new() { Predicate = r => r.Tags.Contains("live") });
app.MapHealthChecks("/health/ready", new() { Predicate = r => r.Tags.Contains("ready") });
```

自定义检查实现 `IHealthCheck`，把"依赖能不能连上"这类逻辑写进去。

## 常见误区

❌ liveness 探针里检查数据库等外部依赖：数据库一抖，编排器就把本来健康的应用**重启**，越重启越糟。外部依赖属于 readiness，不属于 liveness。

❌ 只有一个 `/health` 端点混用两种语义，编排器无法区分"该重启"还是"该暂停流量"。分开 live/ready。

❌ 健康检查里做重量级操作（复杂查询、长耗时调用），探针频繁调用反而拖垮应用。检查要轻量快速。

## 适用版本

健康检查中间件各受支持版本通用；`AddDbContextCheck` 需 EF Core 对应包。

## 参考资料

- [容器化](containers.md)
- [.NET Aspire](aspire.md)
- 官方文档：[ASP.NET Core 健康检查](https://learn.microsoft.com/aspnet/core/host-and-deploy/health-checks)
