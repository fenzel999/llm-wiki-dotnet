---
title: 输入验证（DataAnnotations / 内置验证）
summary: 内置 DataAnnotations + IValidatableObject 做边界验证；net10 最小 API 内置验证自动 400/422，弃第三方库。
tags: [validation, dataannotations, ivalidatable-object, minimal-api]
introduced-in: general
applies-to: [net8, net9, net10]
status: stable
source: https://learn.microsoft.com/aspnet/core/mvc/models/validation
updated: 2026-07-10
---

# 输入验证（DataAnnotations / 内置验证）

> **要点速览**
> - 永不信任外部输入；验证做在**边界**尽早拦截。
> - 用内置 **DataAnnotations** 特性 + `IValidatableObject`（跨字段），不引 FluentValidation。
> - 不合法返回 **400**（模型绑定失败）或 **422**（模型校验失败，见 [异常处理](exception-handling.md)）。
> - 服务端验证是底线（前端可绕过）；JSON 用**源生成**序列化才 AOT 安全。
> - net10 最小 API 内置验证 `AddValidation()`，不合法自动 400。

## 概述

永远不要信任外部输入。验证要做在边界上——请求一进来就挡住不合法数据，别让脏数据渗进业务逻辑。.NET **内置**验证是 `System.ComponentModel.DataAnnotations`：用特性（`[Required]`、`[Range]`、`[StringLength]`、`[EmailAddress]`、`[RegularExpression]` 等）声明规则，框架在模型绑定后自动校验。跨字段复杂规则实现 `IValidatableObject.Validate`，或写自定义 `ValidationAttribute`。

按 [P10](../../governance/policy.md) **不引入 FluentValidation 等第三方库**——DataAnnotations 覆盖绝大多数场景，复杂逻辑用 `IValidatableObject`/自定义特性手写。net10 起最小 API **内置** DataAnnotations 自动验证（`AddValidation()`）：过去要手动检查的场景现在开箱即用。

## 正确做法

### 1. 特性声明 + 跨字段规则

```csharp
public class CreateOrder : IValidatableObject
{
    [Required, StringLength(20)] public string Sku { get; set; } = "";
    [Range(1, 1000)] public int Qty { get; set; }
    public DateOnly? ShipDate { get; set; }

    public IEnumerable<ValidationResult> Validate(ValidationContext ctx)
    {
        if (ShipDate is { } d && d < DateOnly.FromDateTime(DateTime.UtcNow))
            yield return new("发货日期不能早于今天", [nameof(ShipDate)]);
    }
}
```

### 2. 自定义 `ValidationAttribute`

```csharp
public sealed class NoSpacesAttribute : ValidationAttribute
{
    public override bool IsValid(object? value)
        => value is string s && !s.Contains(' ');
}
// [NoSpaces] public string Code { get; set; }
```

### 3. net10 最小 API 内置验证（自动 400/422）

```csharp
builder.Services.AddValidation();   // net10+ 最小 API 内置验证
app.MapPost("/orders", (CreateOrder o) => Results.Ok(o))   // 不合法自动 400
    .WithValidationFilter();         // 挂内置验证过滤器（net10）
```

### 4. 失败时返回结构化错误（422）

模型绑定失败默认 400；模型校验失败建议返回 **422 + `ProblemDetails`**（RFC 9457，见 [异常处理](exception-handling.md)）。net10 内置验证默认即结构化错误体。

## 常见误区

❌ **验证写在业务逻辑深处**，脏数据已流入多层才报错。放在边界（模型绑定处）尽早拦截。

❌ **只做前端验证**。前端可被绕过，服务端验证是底线。

❌ **为简单校验引入 FluentValidation 等第三方库**（[P10](../../governance/policy.md)）。用内置 DataAnnotations + `IValidatableObject`，复杂规则手写特性。

❌ **手动 `if (string.IsNullOrEmpty(...))` 一条条堆**，散乱难维护。用声明式特性集中表达规则。

❌ **把校验当业务规则的全部**。验证只管"输入格式合法"；业务不变量（如"状态机只能这么转"）属于领域层（见 [DDD](../../architecture/ddd.md)），别混为一谈。

## 适用版本

DataAnnotations 全版本通用；自定义 `ValidationAttribute`/`IValidatableObject` 全版本通用；**最小 API 内置验证 net10+**（早期版本用 `WithValidationFilter`/手写过滤器，或用 MVC 模型绑定）。

### Native AOT 兼容性

验证特性与 `IValidatableObject` 是普通 C#，**兼容 Native AOT**（[P16](../../governance/policy.md)、[AOT 矩阵](../aot/aot-compatibility.md)）。注意：请求/响应 **JSON 反序列化**在 AOT 下必须用 `System.Text.Json` **源生成**（`JsonSerializerContext`，见 [序列化](../csharp/serialization.md)），否则校验前就因反射序列化失败。net10 最小 API 元数据与验证在 AOT 下由源生成支撑。

## 参考资料

- [全局异常处理（400/422/ProblemDetails）](exception-handling.md)
- [ASP.NET Core 10（最小 API 验证）](aspnet-core-10.md) · [命名与 API 约定](../../standards/coding-conventions.md)
- [AOT 兼容性矩阵](../aot/aot-compatibility.md)
- 官方文档：[ASP.NET Core 模型验证](https://learn.microsoft.com/aspnet/core/mvc/models/validation) · [最小 API 验证](https://learn.microsoft.com/aspnet/core/fundamentals/minimal-apis/validation)
