---
title: ASP.NET Core 10 Web 特性
summary: .NET 10 关键 Web 特性——最小 API 内置验证、TypedResults、原生 OpenAPI 3.1、MapGroup 分组与 AOT 源生成。
tags: [aspnet-core, minimal-api, validation, openapi, net10]
introduced-in: net10
applies-to: [net10]
status: stable
source: https://learn.microsoft.com/aspnet/core/release-notes/aspnetcore-10.0
updated: 2026-07-10
---

# ASP.NET Core 10 Web 特性

> **要点速览**
> - 最小 API **内置验证**：DataAnnotations 不合法自动 `400`，无需 FluentValidation/Swashbuckle。
> - **`TypedResults`/`Results<T>`** 表达多结果，类型安全、AOT 友好。
> - 原生 **OpenAPI 3.1**（`AddOpenApi()` + `MapOpenApi()`），不装第三方 Swagger 包。
> - **`MapGroup`** 分组复用前缀/过滤器/授权；端点组织见[最小 API 组织](../../patterns/composition.md#minimal-api-organization)。
> - 最小 API 是 **AOT 支持**的路径（[P16](../../governance/policy.md)）。

## 概述

过去写最小 API（minimal API），校验请求体常引 FluentValidation、出文档常挂 Swashbuckle/Swagger——都是"第三方外加"，每个项目重复装包、配置、踩坑。ASP.NET Core 10 把这些**约定级能力收进框架本身**：内置验证、内置 OpenAPI。配合既有的 `TypedResults`、`MapGroup`，最小 API 现在是一套几乎零样板、强类型、AOT 友好的完整写法。

## 正确做法

### 1. 内置验证（自动 400 + ProblemDetails） {#minimal-api-validation}

```csharp
var builder = WebApplication.CreateBuilder(args);
builder.Services.AddValidation();            // 为所有最小 API 启用内置验证
var app = builder.Build();

app.MapPost("/users", (CreateUser input) => Results.Ok(input));
// [Required]/[Range] 等特性自动校验；失败直接 400 + ProblemDetails，处理程序不执行

record CreateUser(
    [Required, StringLength(50)] string Name,
    [Range(0, 130)] int Age);
```

跨字段规则用 `IValidatableObject`；某端点要跳过验证用 `.DisableValidation()`。

### 2. 类型化结果：`TypedResults` / `Results<T>`

不要"永远 200"——用具体 `TypedResults` 表达真实状态，且对 OpenAPI/AOT 友好：

```csharp
app.MapGet("/orders/{id}", async (int id, OrdersDbContext db) =>
    await db.Orders.FindAsync(id) is { } o
        ? Results.Ok(o)                       // 200
        : Results.NotFound());                // 404（见 异常处理）

// 多个结果时声明返回类型，便于 OpenAPI 与 AOT 源生成
app.MapPost("/orders", (CreateOrder cmd) =>
    Results.Created($"/orders/{cmd.Id}", cmd))
    .Produces<Order>(StatusCodes.Status201Created)
    .ProducesProblem(StatusCodes.Status400BadRequest);
```

### 3. 原生 OpenAPI 3.1 {#openapi-3-1}

```csharp
builder.Services.AddOpenApi();     // 生成 OpenAPI 3.1
var app = builder.Build();
app.MapOpenApi();                   // 暴露 /openapi/v1.json
app.MapGet("/ping", () => "pong").WithSummary("健康检查");
```

> 内置 `AddOpenApi` 只生成 JSON 文档（`/openapi/v1.json`），**不含**可交互 UI；是否再挂第三方 UI 由你决定，本库不引入 Swashbuckle / Scalar 等第三方包（见 [POLICY P10](../../governance/policy.md)）。

### 4. `MapGroup` 分组复用前缀/授权/过滤器

```csharp
var api = app.MapGroup("/api/orders").RequireAuthorization("User");

api.MapGet("/", ListAsync);
api.MapPost("/", CreateAsync);      // 共享 "/api/orders" 前缀与授权策略
```

### 5. 版本差异

=== "net10"
    最小 API 内置验证 + 自动 400；`AddOpenApi()` 生成 **OpenAPI 3.1**；`TypedResults` 完善。

=== "net9"
    无内置验证，需手写过滤器；`AddOpenApi()` 可用但生成 **OpenAPI 3.0**。

=== "net8"
    无内置 OpenAPI 生成器、无内置最小 API 验证，需第三方。

## 常见误区

❌ **漏注册 `AddValidation()`**——不注册则注解完全不生效，请求被照单全收。验证要显式开启。

❌ **一边用内置验证、一边手写另一套校验并返回不同格式**——调用方拿到两种不一致的错误形态。统一走内置验证的 ProblemDetails。

❌ **返回"总是 200 + 包装体"**——破坏 HTTP 语义与 OpenAPI。用 `TypedResults`/`Results<T>` 表达真实状态（见 [异常处理](exception-handling.md)）。

❌ **Swashbuckle / FluentValidation 与内置方案并存**——两套机制、两份配置、易冲突。本库统一用 .NET 10 原生方案（[P10](../../governance/policy.md)）。

❌ **`record` 参数特性没生效**——确认 `[Required]` 等确实修饰成员而非裸构造参数；用 `record` 时写在位置参数属性上即可。

## 适用版本

=== "net10"
    最小 API 内置验证、自动 400；原生 `AddOpenApi()` 生成 **OpenAPI 3.1**；`TypedResults`/`MapGroup` 成熟。

=== "net9"
    无内置验证；`AddOpenApi()` 生成 **OpenAPI 3.0**。

=== "net8"
    无内置 OpenAPI 生成器、无内置最小 API 验证。

### Native AOT 兼容性

最小 API **是 AOT 支持**的路径（✅，[P16](../../governance/policy.md)、[AOT 矩阵](../aot/aot-compatibility.md)）。配套要点：用 `TypedResults`/`Results<T>` 让源生成器推断返回类型；响应 JSON 用 `System.Text.Json` **源生成**（见 [序列化](../csharp/serialization.md)）；声明 `Produces<T>`/`ProducesProblem` 帮助 AOT 源生成器覆盖所有返回形状。MVC/控制器不支持 AOT，故本库统一最小 API。

## 参考资料

- [最小 API 组织（分组/端点）](../../patterns/composition.md#minimal-api-organization)
- [输入验证（DataAnnotations）](validation.md) · [全局异常处理（400/422）](exception-handling.md)
- [AOT 兼容性矩阵](../aot/aot-compatibility.md)
- 官方文档：[What's new in ASP.NET Core 10](https://learn.microsoft.com/aspnet/core/release-notes/aspnetcore-10.0)
