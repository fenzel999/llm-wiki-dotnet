---
title: 最小 API 验证（FluentValidation）
summary: .NET 10 最小 API 用 FluentValidation 做请求验证，并以端点过滤器统一返回 400。
tags: [aspnetcore, minimal-api, validation, fluentvalidation, net10]
introduced-in: net10
applies-to: [net10]
status: stable
source: sources/README.md
updated: 2026-07-09
---

## 概述

本项目在 .NET 10 最小 API（Minimal API）中使用 **FluentValidation** 做请求验证，而非数据注解手写分支。
验证失败时由统一的端点过滤器返回 `400 Bad Request` + problem details，处理程序内不再写校验逻辑。

> 替代方案：.NET 10 也内置了基于数据注解的 `AddValidation()` / `.WithValidation()` 轻量验证
> （见下方「适用版本」）。本仓库约定优先用 FluentValidation，便于复杂规则与可测试性。

## 正确做法

安装：`FluentValidation`、`FluentValidation.DependencyInjectionExtensions`。

定义验证器：

```csharp
using FluentValidation;

public record CreateUser(string Name, int Age);

public class CreateUserValidator : AbstractValidator<CreateUser>
{
    public CreateUserValidator()
    {
        RuleFor(x => x.Name).NotEmpty().MaximumLength(50);
        RuleFor(x => x.Age).InclusiveBetween(0, 130);
    }
}
```

注册（一次性扫描程序集内所有验证器）：

```csharp
builder.Services.AddValidatorsFromAssemblyContaining<CreateUserValidator>();
```

统一的验证过滤器，把 FluentValidation 接入最小 API：

```csharp
using FluentValidation;
using Microsoft.AspNetCore.Http.HttpResults;

public sealed class ValidationFilter<T> : IEndpointFilter
{
    public async ValueTask<object?> InvokeAsync(
        EndpointFilterInvocationContext ctx, EndpointFilterDelegate next)
    {
        var validator = ctx.HttpContext.RequestServices.GetService<IValidator<T>>();
        if (validator is null) return await next(ctx);

        var model = ctx.Arguments.OfType<T>().FirstOrDefault();
        if (model is null) return await next(ctx);

        var result = await validator.ValidateAsync(model);
        if (!result.IsValid)
            return Results.ValidationProblem(result.ToDictionary());

        return await next(ctx);
    }
}
```

在端点上应用：

```csharp
app.MapPost("/users", (CreateUser input) => Results.Ok(input))
   .AddEndpointFilter<ValidationFilter<CreateUser>>();
```

无效请求（如 `Age = 200`）自动得到 `400` 与字段级错误，处理程序只关心成功路径。

## 常见错误

- 忘记注册验证器（`AddValidatorsFromAssemblyContaining`），导致无验证生效。
- 把校验逻辑又写进处理程序，与过滤器重复、返回两种不一致的错误格式。
- 验证器命名未与请求类型对应，难以定位。
- 在 `record` 位置参数上误用目标特性（FluentValidation 直接对属性/成员写规则，无需 `[param: ...]`）。

## 适用版本

=== "net10"
    推荐 FluentValidation（如上）。也可使用内置 `AddValidation()` + `.WithValidation()` 的轻量验证。

=== "net8"
    无内置验证，使用 FluentValidation（同一套写法）或手写过滤器。

## 参考资料

- [源汇总 sources/README.md](../../sources/README.md)
- 相关：[原生 OpenAPI 3.1](openapi-3-1.md)
