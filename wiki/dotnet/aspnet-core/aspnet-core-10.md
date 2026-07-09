---
title: ASP.NET Core 10 Web 特性
summary: .NET 10 / ASP.NET Core 10 的关键 Web 特性——最小 API 内置验证（自动 400）、原生 OpenAPI 3.1 文档。
tags: [aspnetcore, minimal-api, validation, openapi, net10]
introduced-in: net10
applies-to: [net10]
status: stable
source: https://learn.microsoft.com/aspnet/core/release-notes/aspnetcore-10.0
updated: 2026-07-10
---

## 概述

ASP.NET Core 10 在最小 API 的验证与 API 文档上做了“去第三方依赖”的增强：一是最小 API 内置模型验证，无需 FluentValidation 等库即可对绑定参数自动校验并返回 `400`；二是原生 `AddOpenApi()` 直接生成 OpenAPI 3.1 文档，不再需要 Swashbuckle。本页汇总这两个约定级特性，端点组织方式见 [最小 API 组织](../../patterns/composition.md#minimal-api-organization)。

## 正确做法

### 最小 API 内置验证 {#minimal-api-validation}

.NET 10 的最小 API **内置了模型验证**，无需 FluentValidation / 第三方库。绑定到处理程序的参数若带有 `System.ComponentModel.DataAnnotations` 特性（如 `[Required]`、`[Range]`、`[StringLength]`），框架在执行处理程序前自动校验；失败时直接返回 `400 Bad Request` + Problem Details，无需手写校验分支。

> 约定：**使用 .NET 10 原生验证，不引入 FluentValidation。**

```csharp
using System.ComponentModel.DataAnnotations;

var builder = WebApplication.CreateBuilder(args);
builder.Services.AddValidation();   // 为所有最小 API 自动启用内置验证
var app = builder.Build();

app.MapPost("/users", (CreateUser input) => Results.Ok(input));
// 带 [Required]/[Range] 等特性的参数会自动校验；失败返回 400 + Problem Details

app.Run();

record CreateUser(
    [Required, StringLength(50)] string Name,
    [Range(0, 130)] int Age);
```

发送 `Age = 200` 会自动得到 `400` 与字段级错误，处理程序只关心成功路径。个别端点需跳过自动校验时调用 `.DisableValidation()`；也支持实现 `IValidatableObject` 做跨属性校验。

**常见错误**

- 忘记注册验证（`AddValidation()`），导致注解被忽略。
- 在 `record` 位置参数上未用 `[Required]` 等目标特性正确落到成员。
- 手写校验与内置验证重复，返回两种不一致的错误格式。

### 原生 OpenAPI 3.1 {#openapi-3-1}

.NET 10 的 ASP.NET Core 原生支持生成 OpenAPI 3.1 文档。**不再需要 Swashbuckle（Swagger）**：内置的 `Microsoft.AspNetCore.OpenApi` 直接产出符合 3.1 的文档，并与最小 API 元数据、JSON Schema 对齐（3.1 完全兼容 JSON Schema）。

> 约定：**本项目不使用 Swagger/Swashbuckle**。API 文档由 .NET 10 原生 `AddOpenApi()` 生成。

```csharp
var builder = WebApplication.CreateBuilder(args);
builder.Services.AddOpenApi();
var app = builder.Build();

app.MapOpenApi();   // 暴露 /openapi/v1.json

app.MapGet("/ping", () => "pong")
   .WithSummary("健康检查");

app.Run();
```

**常见错误**

- 继续引用 Swashbuckle：`AddSwaggerGen` / `UseSwagger` / `UseSwaggerUI` 不应出现；一律改用原生 `AddOpenApi()` + `MapOpenApi()`。
- 期望内置生成同时提供交互式 UI：`AddOpenApi` 只生成文档（JSON）。若需要 UI，引入轻量替代品（如 Scalar）并指向 `MapOpenApi` 的文档端点。
- 依赖 3.0 独有的写法而未适配 3.1 的 JSON Schema 语义（如 `nullable` 表达方式变化）。

## 适用版本

=== "net10"
    最小 API 内置验证与自动 400；原生 `AddOpenApi()` 生成 **OpenAPI 3.1**。

=== "net9"
    无内置验证，需手写过滤器或第三方库；原生 `AddOpenApi()` 已可用但生成 **OpenAPI 3.0**。

=== "net8"
    无内建 OpenAPI 生成器，需第三方库；无内置最小 API 验证。

## 参考资料

- 相关：[最小 API 组织](../../patterns/composition.md#minimal-api-organization)
- 官方文档：[What's new in ASP.NET Core 10](https://learn.microsoft.com/aspnet/core/release-notes/aspnetcore-10.0)
