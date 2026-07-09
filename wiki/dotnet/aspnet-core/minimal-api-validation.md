---
title: 最小 API 验证（.NET 10 内置）
summary: .NET 10 最小 API 用框架内置验证，带数据注解的参数自动校验并返 400，无需第三方库。
tags: [aspnetcore, minimal-api, validation, net10]
introduced-in: net10
applies-to: [net10]
status: stable
source: sources/README.md
updated: 2026-07-09
---

## 概述

.NET 10 的最小 API（Minimal API）**内置了模型验证**，无需 FluentValidation / 第三方库。
绑定到处理程序的参数若带有 `System.ComponentModel.DataAnnotations` 特性（如 `[Required]`、
`[Range]`、`[StringLength]`），框架在执行处理程序前自动校验；失败时直接返回
`400 Bad Request` + Problem Details，无需手写校验分支。

> 约定：**使用 .NET 10 原生验证，不引入 FluentValidation。**

## 正确做法

注册内置验证即可，所有带数据注解参数的端点会自动校验：

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

发送 `Age = 200` 会自动得到 `400` 与字段级错误，处理程序只关心成功路径。

个别端点需跳过自动校验时调用 `.DisableValidation()`：

```csharp
app.MapPost("/import", (CreateUser input) => Results.Ok(input))
   .DisableValidation();
```

也支持实现 `IValidatableObject` 做跨属性校验：

```csharp
public class CreateUser : IValidatableObject
{
    [Required] public string Name { get; set; } = "";
    public string? ConfirmName { get; set; }

    public IEnumerable<ValidationResult> Validate(ValidationContext ctx)
    {
        if (!string.Equals(Name, ConfirmName, StringComparison.Ordinal))
            yield return new ValidationResult("两次输入不一致", [nameof(ConfirmName)]);
    }
}
```

## 常见错误

- 忘记注册验证（`AddValidation()`），导致注解被忽略。
- 在 `record` 位置参数上未用 `[Required]` 等目标特性正确落到成员。
- 期望验证可递归深入嵌套对象却未标注可验证成员。
- 手写校验与内置验证重复，返回两种不一致的错误格式。

## 适用版本

=== "net10"
    最小 API 内置验证与自动 400（本仓库约定做法）。

=== "net9"
     无内置验证（net9 仅有内建 OpenAPI，未带验证），需手写过滤器或引入第三方验证库。

=== "net8"
     无内置验证，需手写过滤器或引入第三方验证库。

## 参考资料

- [源汇总 sources/README.md](../../sources/README.md)
- 相关：[原生 OpenAPI 3.1](openapi-3-1.md)
