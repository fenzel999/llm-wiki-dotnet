---
title: Minimal API AOT 源生成
summary: 编译期生成请求委托（RDG）、OpenAPI 静态生成、Boxed Enum 优化、路由分组+过滤器+版本控制的 AOT 写法。
tags: [aspnet-core, minimal-api, source-generators, native-aot, openapi]
introduced-in: net8
applies-to: [net8, net9, net10]
status: stable
source: https://learn.microsoft.com/aspnet/core/fundamentals/native-aot
updated: 2026-07-11
---

# Minimal API AOT 源生成

> **要点速览**
> - **RDG (Request Delegate Generator)**：编译期生成请求委托，替代运行时反射绑定。
> - **JsonSerializerContext**：所有返回/入参类型必须显式注册，禁用反射式 `JsonSerializer.Serialize(obj)`。
> - **路由模式编译期绑定**：`MapGet("/user/{id:int}")` 在编译期解析参数绑定，无运行时解析开销。
> - **OpenAPI 静态生成**：`AddOpenApi()` 源生成器编译期产出 OpenAPI 3.1 JSON。
> - **Minimal API = AOT 首选**；MVC/控制器不支持 AOT（[P16](../../governance/policy.md)）。

## 概述

ASP.NET Core 10 继续深化 AOT 支持，核心是**移除运行时反射，转向构建时生成**。.NET 8+ 引入 **Request Delegate Generator (RDG)**、**OpenAPI 源生成器**、**LoggerMessage/JsonSourceGeneration** 等源生成器，将运行时反射全部前置到编译期。

AOT 下 Minimal API 的核心原则：**一切在编译期可知、一切可被源生成器覆盖**。

## 正确做法

### 1. 启用 AOT 与必要的源生成器

```xml
<!-- .csproj -->
<PropertyGroup>
  <TargetFramework>net10.0</TargetFramework>
  <PublishAot>true</PublishAot>
  <InvariantGlobalization>true</InvariantGlobalization>
  <EnableConfigurationBindingGenerator>true</EnableConfigurationBindingGenerator>
  <EnableRequestDelegateGenerator>true</EnableRequestDelegateGenerator>
</PropertyGroup>

<ItemGroup>
  <PackageReference Include="Microsoft.AspNetCore.OpenApi" Version="10.*" />
  <PackageReference Include="System.Text.Json" Version="10.*" />
</ItemGroup>
```

### 2. JsonSerializerContext —— AOT 序列化强制要求

```csharp
[JsonSerializable(typeof(UserDto))]
[JsonSerializable(typeof(CreateUserRequest))]
[JsonSerializable(typeof(ErrorResponse))]
[JsonSourceGenerationOptions(PropertyNamingPolicy = JsonKnownNamingPolicy.CamelCase)]
public partial class AppJsonContext : JsonSerializerContext { }

// Program.cs
builder.Services.ConfigureHttpJsonOptions(o =>
    o.SerializerOptions.TypeInfoResolver = AppJsonContext.Default);
```

| 写法 | AOT | 说明 |
|------|-----|------|
| `JsonSerializer.Serialize(obj)` | ❌ 失败 | 反射获取类型元数据被裁剪 |
| `JsonSerializer.Serialize(obj, AppJsonContext.Default.Type)` | ✅ | 编译期已生成 `JsonTypeInfo` |

### 3. RDG (Request Delegate Generator) —— 编译期绑定

```csharp
var builder = WebApplication.CreateBuilder(args);
builder.Services.AddSingleton<IEmailService, EmailService>();

var app = builder.Build();

// RDG 编译期生成：请求委托工厂 + 参数绑定 + 验证
app.MapPost("/api/orders", async (CreateOrderDto dto, IEmailService email, CancellationToken ct) =>
{
    var order = await email.SendAsync(dto.Email, ct);
    return Results.Created($"/orders/{order.Id}", order);
})
.Produces<OrderResponse>(StatusCodes.Status201Created)
.ProducesProblem(StatusCodes.Status400BadRequest)
.WithName("CreateOrder")
.WithTags("Orders");

app.Run();

public record CreateOrderDto(string Email, int Qty);
public record OrderResponse(int Id, string Email);
```

### 4. OpenAPI 静态生成（零反射）

```csharp
builder.Services.AddOpenApi();  // 编译期生成 OpenAPI 3.1

var app = builder.Build();
if (app.Environment.IsDevelopment())
    app.MapOpenApi();  // 暴露 /openapi/v1.json
```

### 5. 版本控制 + 分组 + 过滤器（AOT 写法）

```csharp
var api = app.MapGroup("/api/v1")
    .WithTags("Orders")
    .AddEndpointFilter<ValidationFilter>();

api.MapPost("/orders", CreateOrder)
    .Produces<OrderResponse>(201)
    .ProducesProblem(400);

api.MapGet("/orders/{id:int}", GetOrder)
    .Produces<OrderResponse>(200)
    .Produces(404);
```

## 常见误区

❌ **以为 RDG 自动处理所有情况** —— 复杂绑定（自定义模型绑定器、动态 `IQueryable` 构建）仍需手写委托。

❌ **以为 `EnableOpenApi` 就能生成完整文档** —— 需在端点上显式 `.Produces()`、`.WithName()`、`.WithTags()` 等元数据，否则生成文档空泛。

❌ **以为 AOT 下 `MapControllers()` 也能用源生成** —— **MVC/Controller 完全不支持 AOT**，必须用 Minimal API。

### Native AOT 兼容性

- 本页整篇即围绕 AOT 展开：Minimal API 是 AOT 路径的**唯一** Web 框架，MVC/控制器不支持 AOT（[P16](../../governance/policy.md)）。
- 要点重申：**JsonSerializerContext 源生成**（禁用反射式 `JsonSerializer.Serialize(obj)`）、**RDG 编译期请求委托**、**OpenAPI 静态生成**、**显式 DI 注册**——四者缺一不可。
- 复杂绑定/动态 `IQueryable` 构建仍需手写委托，无法被源生成器覆盖。

## 参考资料

- [ASP.NET Core Native AOT 支持](https://learn.microsoft.com/aspnet/core/fundamentals/native-aot)
- [Request Delegate Generator](https://github.com/dotnet/aspnetcore/blob/main/src/Http/Routing/src/RequestDelegateGenerator/)
- [OpenAPI 源生成器](https://github.com/dotnet/aspnetcore/tree/main/src/OpenApi)
- [AOT 兼容性矩阵](../../dotnet/aot/aot-compatibility.md) · [AOT 部署工程化](../../deployment/aot-ci-cd.md) · [AOT 性能工程](../../performance/aot-performance.md)