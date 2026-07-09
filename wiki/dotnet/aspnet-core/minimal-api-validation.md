---
title: 最小 API 内置验证
summary: ASP.NET Core 最小 API 支持内置模型验证，无效请求自动返回 400。
tags: [aspnetcore, minimal-api, validation, net10]
introduced-in: net10
applies-to: [net10]
status: stable
source: sources/README.md
updated: 2026-07-09
---

## 概述

.NET 10 的 ASP.NET Core 最小 API（Minimal API）内置了模型验证（validation）支持。绑定到参数的类型若带有 `System.ComponentModel.DataAnnotations` 特性（数据注解，如 `[Required]`、`[Range]`），框架会在处理程序执行前自动校验，验证失败时直接返回 `400 Bad Request` 与 problem details，无需手写校验分支。

## 正确做法

启用验证并声明校验规则：

```csharp
using System.ComponentModel.DataAnnotations;

var builder = WebApplication.CreateBuilder(args);
builder.Services.AddValidation();
var app = builder.Build();

app.MapPost("/users", (CreateUser input) => Results.Ok(input))
   .WithValidation();

app.Run();

record CreateUser(
    [param: Required] string Name,
    [param: Range(0, 130)] int Age);
```
<!-- ⚠️ needs-your-call: 确认 AddValidation()/WithValidation() 的确切 API 名称 -->

发送 `Age = 200` 的请求会自动得到 400 及字段级错误，无需在处理程序内判断。

## 常见错误

- 忘记注册验证服务（`AddValidation()`），导致注解被忽略。
- 在 `record` 位置参数上未用 `[param: ...]` 目标，特性落到属性/构造函数错误位置。
- 期望验证深层嵌套对象却未标注可递归验证的成员。
- 手写校验与内置验证重复，返回两种不一致的错误格式。

## 适用版本

=== "net10"
    最小 API 内置验证与自动 400。

=== "net8"
    需借助过滤器或第三方库（如 FluentValidation）手动校验。

## 参考资料

- [源汇总 sources/README.md](../../sources/README.md)
- 相关：[原生 OpenAPI 3.1](openapi-3-1.md)

