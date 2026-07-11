---
title: API 网关与 BFF（Backends for Frontends）
summary: 网关在边缘做路由、聚合与横切关注点；BFF 让每种客户端拥有专属聚合层，避免"上帝网关"与领域模型泄漏。
tags: [architecture, api-gateway, bff, yarp, aspnet-core]
introduced-in: general
applies-to: [all]
status: stable
source: https://learn.microsoft.com/en-us/dotnet/architecture/microservices/ & https://learn.microsoft.com/en-us/dotnet/architecture/modern-web-apps-azure/ & https://learn.microsoft.com/en-us/aspnet/core/fundamentals/servers/yarp
updated: 2026-07-11
---

> **要点速览**
> - 网关是系统的**边缘入口**：负责路由、请求聚合、认证、限流、缓存、TLS 终止与请求关联（correlation）。
> - BFF 是"一种客户端一个后端"的反模式解药：Web、移动端、公开 API 各有一层聚合，避免把领域模型直接塞给前端。
> - 网关（Edge/Ingress）解决**南北向**问题；服务网格（Service Mesh）解决**东西向**服务间通信，二者互补而非替代。
> - 用 [YARP（Microsoft.ReverseProxy）](https://learn.microsoft.com/en-us/dotnet/architecture/modern-web-apps-azure/) 做官方反向代理，全部手写，不引入第三方网关框架。
> - 网关只做**横切**与**轻量聚合**，不要把业务编排塞进网关，否则会重新变成耦合的单体。
> - 聚合会引入延迟与单点故障，需配合超时、熔断与缓存；可编译为 **Native AOT** 以缩短冷启动。

## 概述

在微服务与分布式系统中，客户端不应直接连到每个后端服务。一个客户端直连十几个服务会带来：过多的网络往返（chatty calls）、每个客户端重复实现认证/限流、难以演进后端（重命名、拆分、合并服务会破坏前端契约）。

**API 网关（API Gateway）** 是位于系统边缘的反向代理与聚合层。它对外暴露统一入口，对内将请求路由到对应服务，并在边缘统一承载横切关注点。

**BFF（Backends for Frontends）** 是网关模式的一种细化：不为所有客户端建一个"上帝网关"，而是为每类客户端（服务端渲染 Web、移动 App、第三方公开 API、内部后台）各建一个专属后端。这样每种前端只需自己关心的字段与聚合，避免通用网关臃肿、避免把后端领域模型直接泄漏给千差万别的前端。

### 网关与 BFF 的职责边界

| 关注点 | 属于边缘（网关/BFF） | 属于服务网格 / 内部 |
| --- | --- | --- |
| 路由 / 反向代理 | ✅ | — |
| 认证、授权（边缘 JWT 校验） | ✅ | 内部 mTLS（服务网格） |
| 限流、配额 | ✅ | — |
| 请求聚合 / 组合 | ✅（BFF 核心） | 服务间调用（网格） |
| 缓存、TLS 终止、CORS | ✅ | — |
| 服务发现、负载均衡（东西向） | — | ✅（网格） |
| 业务编排、领域规则 | ❌ | ✅（各服务内） |

> 网关解决**南北向**（客户端↔系统）问题；服务网格解决**东西向**（服务↔服务）问题。二者长期共存，不要把服务网格的能力硬塞进网关，也不要把业务编排硬塞进网关。

## 正确做法

### 用 YARP 搭建反向代理（官方 Microsoft.ReverseProxy）

YARP 是微软官方的反向代理库，作为 ASP.NET Core 中间件运行，支持配置驱动或代码驱动路由、负载均衡与主动健康检查，且兼容 Native AOT。

`appsettings.json` 最小配置：

```json
{
  "ReverseProxy": {
    "Routes": {
      "catalog-route": {
        "ClusterId": "catalog-cluster",
        "Match": { "Path": "/catalog/{**catch-all}" }
      },
      "orders-route": {
        "ClusterId": "orders-cluster",
        "Match": { "Path": "/orders/{**catch-all}" }
      }
    },
    "Clusters": {
      "catalog-cluster": {
        "Destinations": {
          "catalog-a": { "Address": "https://catalog-svc:8080" }
        }
      },
      "orders-cluster": {
        "Destinations": {
          "orders-a": { "Address": "https://orders-svc:8080" }
        }
      }
    }
  }
}
```

`Program.cs`（Minimal API，无 MVC）：

```csharp
using Microsoft.AspNetCore.Builder;
using Microsoft.Extensions.DependencyInjection;

var builder = WebApplication.CreateBuilder(args);

// 加载上面的 ReverseProxy 配置
builder.Services.AddReverseProxy()
    .LoadFromConfig(builder.Configuration.GetSection("ReverseProxy"));

// 边缘横切：认证 + 限流（见下）
builder.Services.AddAuthentication().AddJwtBearer();
builder.Services.AddRateLimiter(o => { /* 见 限流 章节 */ });

var app = builder.Build();

app.UseAuthentication();
app.UseAuthorization();
app.UseRateLimiter();

app.MapReverseProxy();
app.Run();
```

### BFF 聚合端点（Minimal API，手写组合）

BFF 的价值在于把"前端需要但分散在多个服务"的数据聚合为一个响应，减少客户端往返。下面用手写的并发 `HttpClient` 调用实现聚合，不依赖任何第三方编排库。

```csharp
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.AspNetCore.Builder;
using Microsoft.Extensions.DependencyInjection;

var builder = WebApplication.CreateBuilder(args);
builder.Services.AddHttpClient();
var app = builder.Build();

// 浏览器专用 BFF：一次返回"首页仪表盘"所需的所有数据
app.MapGet("/bff/web/dashboard/{userId}", async (
    string userId,
    IHttpClientFactory factory,
    CancellationToken ct) =>
{
    var client = factory.CreateClient();
    // 并发聚合，避免串行 chatty calls
    var profileTask = client.GetFromJsonAsync<Profile>(
        AppJsonContext.Default.Profile, $"http://profile-svc/users/{userId}", ct);
    var ordersTask = client.GetFromJsonAsync<Order[]>(
        AppJsonContext.Default.OrderArray, $"http://orders-svc/users/{userId}/recent", ct);

    await Task.WhenAll(profileTask, ordersTask);

    return Results.Ok(new DashboardView(
        Name: profileTask.Result!.Name,
        RecentOrders: ordersTask.Result!));
})
.WithName("WebDashboard");

// 给前端的"视图模型"，与内部领域模型解耦
record DashboardView(string Name, Order[] RecentOrders);
record Profile(string Name);
record Order(string Id, decimal Total);

app.Run();
```

关键点：**返回 `DashboardView` 而非直接透传领域实体**，避免后端领域模型随前端契约一起泄漏、随服务演进被绑死。

### 边缘统一认证与限流

在网关/BFF 入口集中做认证与限流，后端服务只需信任边缘已校验过的身份（例如校验 JWT 后向下游转发声明）。

```csharp
builder.Services.AddAuthentication().AddJwtBearer(o =>
{
    o.Authority = "https://identity.example.com";
    o.Audience = "bff";
});

builder.Services.AddRateLimiter(o => o.AddPolicy("edge", context =>
    RateLimitPartition.GetFixedWindowLimiter(
        context.Connection.RemoteIpAddress?.ToString() ?? "anon",
        _ => new FixedWindowRateLimiterOptions
        {
            PermitLimit = 100,
            Window = TimeSpan.FromMinutes(1)
        })));

app.UseAuthentication();
app.UseAuthorization();
app.UseRateLimiter();
app.MapReverseProxy().RequireRateLimiting("edge");
```

详细的限流策略参见 [限流](../dotnet/aspnet-core/rate-limiting.md)，认证与授权参见 [认证与授权](../dotnet/aspnet-core/auth.md)。

### 网关 vs 直接客户端调用 vs BFF —— 决策表

| 场景 | 推荐 | 理由 |
| --- | --- | --- |
| 单一后端、单一前端 | 直接调用 | 引入网关只增加复杂度 |
| 多服务 + 浏览器 SPA | BFF（Web） | 减少往返、隐藏领域模型 |
| 移动端（弱网、字段不同） | 独立 BFF（Mobile） | 字段裁剪、离线友好 |
| 第三方公开 API | 独立网关/Portal | 配额、审计、版本隔离 |
| 仅做南北向路由、无聚合 | 纯反向代理（YARP） | 轻量，不上 BFF 逻辑 |

## 常见误区

❌ **把所有业务逻辑都放进网关。**
✅ 网关只做横切（认证、限流、路由、聚合）。业务编排应留在各自服务内。把领域规则塞进网关会让网关重新变成耦合单体，丧失微服务自治演进的好处。

❌ **为所有客户端建一个"上帝网关"，直接把后端 DTO 透传给前端。**
✅ 按客户端拆分 BFF，返回专为前端裁剪的视图模型。透传领域实体会把内部模型与前端契约绑死，服务一改前端就崩，且易泄漏不该暴露的字段。

❌ **在 BFF 里串行、逐条地调用下游服务（chatty aggregation）。**
✅ 用 `Task.WhenAll` 并发调用，并对慢依赖设置超时与熔断。串行聚合会把每个下游的延迟累加，网关成为延迟放大器。参考 [API 设计模式](../architecture/api-design.md) 中的延迟预算思路。

❌ **认为网关能替代服务网格。**
✅ 网关处理南北向入口；服务间东西向通信（mTLS、重试、流量切分）由网格负责。二者职责不同，混用会既复杂又脆弱。

❌ **给聚合端点不做缓存、不设超时。**
✅ 对读多写少的组合数据加边缘缓存，并对每个下游调用设 `CancellationToken` 超时。否则一个下游变慢会拖垮整个网关，形成级联故障。

## 适用版本

- **introduced-in: general** —— 网关/BFF 是架构模式，与具体 .NET 版本无关；YARP 自 .NET 6 起可用，后续版本持续增强。
- 适用于 ASP.NET Core 全系列（.NET 6+，含 .NET 8/9/10）。路由、Minimal API、限流、YARP 在所有受支持版本均可使用。
- 与 [微服务](../architecture/microservices.md) 拆分、[限界上下文](../architecture/bounded-context.md) 边界配合时效果最佳：每个 BFF 应大致对应一个或一组限界上下文的对外视图。

### Native AOT 兼容性

网关与 BFF 本身是**后端服务**，非常适合编译为 Native AOT 以缩短容器冷启动、减小镜像体积——这对作为边缘入口、需要快速扩缩容的代理尤其重要。

- **YARP 官方支持 Native AOT**，无需特殊配置即可在 AOT 下运行反向代理。
- 聚合层使用的 JSON 序列化必须走**源生成**，避免运行时反射：

```csharp
using System.Text.Json.Serialization;
using System.Text.Json;

[JsonSerializable(typeof(DashboardView))]
[JsonSerializable(typeof(Profile))]
[JsonSerializable(typeof(Order[]))]
internal partial class AppJsonContext : JsonSerializerContext { }

// 使用：
var json = JsonSerializer.Serialize(view, AppJsonContext.Default.DashboardView);
```

- **显式注册依赖**（避免依赖反射的 `ActivatorUtilities` 动态构造），并使用 `AddReverseProxy().LoadFromConfig(...)` 等 AOT 友好的配置加载方式。
- **避免反射式动态路由**：路由规则用配置或显式代码声明，不要运行时扫描程序集、用反射拼装管道。
- Minimal API 的返回类型需可静态推断（如上面的 `Results.Ok(...)` 记录类型），保证裁剪器能保留所需类型。

## 参考资料

- 微服务架构（含网关模式）：<https://learn.microsoft.com/en-us/dotnet/architecture/microservices/>
- 现代 Web 应用与 BFF/反向代理：<https://learn.microsoft.com/en-us/dotnet/architecture/modern-web-apps-azure/>
- YARP 反向代理官方文档：<https://learn.microsoft.com/en-us/aspnet/core/fundamentals/servers/yarp>
- 边缘限流（[限流](../dotnet/aspnet-core/rate-limiting.md)）
- 边缘认证授权（[认证与授权](../dotnet/aspnet-core/auth.md)）
- 相关模式：[API 设计模式](../architecture/api-design.md)、[微服务](../architecture/microservices.md)、[限界上下文](../architecture/bounded-context.md)
