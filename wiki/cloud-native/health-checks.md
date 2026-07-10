---
title: 健康检查（Health Checks）
summary: 部署层探针——内置 HealthCheck 暴露 liveness/readiness；自定义 IHealthCheck 检查依赖；AOT 兼容。
tags: [health-checks, liveness, readiness, kubernetes]
introduced-in: general
applies-to: [net8, net9, net10]
status: stable
source: https://learn.microsoft.com/aspnet/core/host-and-deploy/health-checks
updated: 2026-07-10
---

# 健康检查（Health Checks）

> **要点速览**
> - 内置健康检查（无需第三方，`Microsoft.Extensions.Diagnostics.HealthChecks`）。
> - 两种探针：**liveness**（进程存活，不健康→重启）vs **readiness**（可否接流量，未就绪→暂停转发但不重启）。用 tag 分组映射到不同端点。
> - liveness **别**查外部依赖（DB 一抖就反复重启）；外部依赖属 readiness。
> - 自定义 `IHealthCheck` 检查依赖连通性；检查必须**轻量快速**。

## 概述

容器编排器（Kubernetes 等）需要持续问应用："你还活着吗？现在能接流量吗？"ASP.NET Core 内置的**健康检查**就是这套机制，全在框架内、无需第三方包。关键是区分两种探针：

| 探针 | 回答 | 不健康时编排器动作 |
|------|------|--------------------|
| **liveness** | 进程是否还健康 | 重启实例 |
| **readiness** | 是否准备好接流量（依赖就绪/预热完成） | 暂停转发，但**不**重启 |

用 **tag** 给检查分组，映射到不同端点，编排器各取所需。

## 正确做法

### 1. 注册带 tag 的检查 + 两个端点

```csharp
builder.Services.AddHealthChecks()
    .AddCheck("self", () => HealthCheckResult.Healthy(), tags: ["live"])
    .AddDbContextCheck<AppDbContext>(tags: ["ready"]);   // 依赖就绪性归 readiness

var app = builder.Build();
app.MapHealthChecks("/health/live",  new() { Predicate = r => r.Tags.Contains("live") });
app.MapHealthChecks("/health/ready", new() { Predicate = r => r.Tags.Contains("ready") });
```

### 2. 自定义依赖检查（实现 `IHealthCheck`）

```csharp
public sealed class RedisHealthCheck(string connection) : IHealthCheck
{
    public async Task<HealthCheckResult> CheckHealthAsync(HealthCheckContext ctx, CancellationToken ct = default)
    {
        try { /* 轻量 ping/连通性探测 */ return HealthCheckResult.Healthy(); }
        catch (Exception ex) { return HealthCheckResult.Unhealthy("Redis 不可达", ex); }
    }
}
builder.Services.AddHealthChecks().AddCheck<RedisHealthCheck>("redis", tags: ["ready"]);
```

### 3. 在 Aspire / K8s 中接线

Aspire 的资源可声明 `WithHealthCheck` 把探针接进编排；K8s 的 `livenessProbe`/`readinessProbe` 指向对应端点路径。

## 常见误区

❌ **liveness 里查数据库等外部依赖**：DB 一抖，编排器就把本健康的实例重启，越重启越糟。外部依赖归 readiness。

❌ **只有一个 `/health` 混用两种语义**：编排器无法区分"该重启"还是"该暂停流量"，只能二选一。分开 live/ready 端点。

❌ **检查做重量级操作**（复杂查询/长耗时调用）：探针高频触发，反而拖垮应用。检查必须轻量、快返回。

❌ **把健康检查当业务监控**：它只回答"活/就绪"，不是指标/追踪。真正可观测性靠 [OpenTelemetry](../dotnet/fundamentals/observability.md)。

## 适用版本

健康检查中间件全版本通用；`AddDbContextCheck` 需 EF Core 包；`IHealthCheck` 通用。

### Native AOT 兼容性

健康检查**兼容 Native AOT**（✅，[P16](../governance/policy.md)、[AOT 矩阵](../dotnet/aot/aot-compatibility.md)）：`AddHealthChecks`、自定义 `IHealthCheck`、tag 筛选、端点映射均为 AOT 安全。注意检查内部若访问数据库/缓存，其客户端库本身需 AOT 友好。

## 参考资料

- [容器化](containers.md) · [.NET Aspire](aspire.md)
- [可观测性（指标/追踪，非健康检查）](../dotnet/fundamentals/observability.md) · [AOT 兼容性矩阵](../dotnet/aot/aot-compatibility.md)
- 官方文档：[ASP.NET Core 健康检查](https://learn.microsoft.com/aspnet/core/host-and-deploy/health-checks)
