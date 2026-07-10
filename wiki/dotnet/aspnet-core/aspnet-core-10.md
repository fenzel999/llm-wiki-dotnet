---
title: ASP.NET Core 10 Web 特性
summary: .NET 10 / ASP.NET Core 10 的关键 Web 特性——最小 API 内置验证（自动 400）、原生 OpenAPI 3.1 文档。
tags: [aspnet-core, minimal-api, validation, openapi, net10]
introduced-in: net10
applies-to: [net10]
status: stable
source: https://learn.microsoft.com/aspnet/core/release-notes/aspnetcore-10.0
updated: 2026-07-10
---

> **要点速览**
> - 最小 API 内置验证：DataAnnotations 不合法自动返回 400。
> - 原生 OpenAPI 3.1 文档生成（内置，无需第三方 Swagger 包）。
> - 延续最小 API 路线：更少样板、更强类型化端点。

## 概述

如果你这两年写过 ASP.NET Core 的最小 API（minimal API），大概对这种组合不陌生：为了校验请求体，引入 FluentValidation 或手写一堆过滤器；为了出一份 API 文档，挂上 Swashbuckle/Swagger。这两件事本身没问题，但它们都是“第三方外加的”，意味着每个项目都得重复装包、重复配置、重复踩坑。ASP.NET Core 10 的思路很直接——把这些约定级的能力收进框架本身。

这一页讲两件最核心的事：最小 API 现在内置了模型验证，参数带数据注解就会自动校验、失败直接返回 400；以及原生的 `AddOpenApi()` 现在直接产出 OpenAPI 3.1 文档，不再需要 Swashbuckle。端点本身怎么组织、怎么分层，不属于本页范围，可以看[最小 API 组织](../../patterns/composition.md#minimal-api-organization)。

## 最小 API 内置验证 {#minimal-api-validation}

先说验证。在 .NET 10 里，最小 API 的模型验证是框架自带的，不需要 FluentValidation，也不需要任何第三方库。规则很简单：只要绑定到处理程序的参数身上带了 `System.ComponentModel.DataAnnotations` 的特性（比如 `[Required]`、`[Range]`、`[StringLength]`），框架在执行你的处理程序之前就会先校验一遍；校验不通过时，它直接返回 `400 Bad Request` 加一份 Problem Details，你根本不需要在业务代码里写任何 `if (!ModelState.IsValid)` 之类的分支。

> 约定：本项目使用 .NET 10 原生验证，不引入 FluentValidation。

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

你只管写“成功之后做什么”。比如有人 POST 一个 `Age = 200`，框架会自动拦截，返回 400 和字段级错误信息，处理程序连执行都执行不到。如果某个特定端点确实想跳过自动校验，调一下 `.DisableValidation()` 即可；要是校验逻辑需要跨属性（比如“开始日期必须早于结束日期”），实现 `IValidatableObject` 就能做。

不过有几种常见失误值得提一句。最容易忘的就是漏了 `AddValidation()` 这一步——不注册，注解就完全不生效，请求会被照单全收。其次，在 `record` 的位置参数上挂特性时，要确认 `[Required]` 等确实落到成员上了，而不是写在不知道哪里的构造参数上。最后，别一边用内置验证、一边又手写一套校验并返回另一种格式的错误，那样会让调用方拿到两种不一致的响应形态。

## 原生 OpenAPI 3.1 {#openapi-3-1}

再说文档。过去出 OpenAPI/Swagger 文档几乎是 Swashbuckle 的天下，但从 .NET 9 起框架就内置了 `Microsoft.AspNetCore.OpenApi`，到 .NET 10 这一步更进了——它直接生成 OpenAPI 3.1 文档。3.1 最重要的变化是它完全对齐 JSON Schema，所以过去 3.0 里那些 `nullable` 之类的特殊处理可以顺势简化。

> 约定：本项目不使用 Swagger/Swashbuckle。API 文档由 .NET 10 原生 `AddOpenApi()` 生成。

```csharp
var builder = WebApplication.CreateBuilder(args);
builder.Services.AddOpenApi();
var app = builder.Build();

app.MapOpenApi();   // 暴露 /openapi/v1.json

app.MapGet("/ping", () => "pong")
   .WithSummary("健康检查");

app.Run();
```

用起来就是 `AddOpenApi()` + `MapOpenApi()` 两行，文档就挂在 `/openapi/v1.json`。这里要纠正一个常见预期：内置的 `AddOpenApi` 只负责“生成文档（JSON）”，它不附带那种可交互的 Swagger UI 页面。如果你或前端同事需要在浏览器里点着试接口，可以接一个轻量的替代品（比如 Scalar），让它指向 `MapOpenApi` 暴露的那个文档端点即可。另外，已经从 Swashbuckle 迁移的项目，记得把 `AddSwaggerGen` / `UseSwagger` / `UseSwaggerUI` 这些调用都清掉，统一走原生方案，别让两套并存。

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
