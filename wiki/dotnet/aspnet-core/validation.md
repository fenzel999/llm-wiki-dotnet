---
title: 输入验证（DataAnnotations / 内置验证）
summary: 用内置 DataAnnotations 与 IValidatableObject 做模型验证；net10 最小 API 内置验证，弃第三方库。
tags: [validation, dataannotations, ivalidatableobject, minimal-api, 校验]
introduced-in: general
applies-to: [all]
status: stable
source: https://learn.microsoft.com/aspnet/core/mvc/models/validation
updated: 2026-07-10
---

## 概述

永远不要信任外部输入。验证要做在边界上——请求一进来就挡住不合法数据，别让脏数据渗进业务逻辑。.NET **内置**的验证机制是 `System.ComponentModel.DataAnnotations`：用特性（`[Required]`、`[Range]`、`[StringLength]`、`[EmailAddress]` 等）声明规则，框架在模型绑定后自动校验。跨字段的复杂规则实现 `IValidatableObject` 的 `Validate` 方法，或写自定义 `ValidationAttribute`。

按 [P10](../../governance/policy.md)，**不引入 FluentValidation 等第三方库**——DataAnnotations 覆盖绝大多数场景，复杂逻辑用 `IValidatableObject`/自定义特性手写即可。net10 起最小 API 也**内置**了对 DataAnnotations 的自动验证支持（`AddValidation()`），过去需要手动检查的场景现在开箱即用。

## 正确做法

用特性声明规则，跨字段规则用 `IValidatableObject`：

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

MVC/控制器自动校验并回填 `ModelState`；net10 最小 API 开启内置验证：

```csharp
builder.Services.AddValidation();                 // net10+ 最小 API 内置验证
app.MapPost("/orders", (CreateOrder o) => Results.Ok());  // 不合法自动 400
```

## 常见误区

❌ 把验证写在业务逻辑深处，脏数据已流入多层才报错。验证放在边界（模型绑定处）尽早拦截。

❌ 只做前端验证不做服务端验证。前端可被绕过，服务端验证是底线。

❌ 为简单校验引入 FluentValidation 等第三方库。按 P10 用内置 DataAnnotations + `IValidatableObject`，复杂规则手写特性。

❌ 手动 `if (string.IsNullOrEmpty(...))` 一条条堆砌，散乱难维护。用声明式特性集中表达规则。

## 适用版本

DataAnnotations 全版本通用；最小 API 内置验证 net10+（早期版本手动校验或用过滤器）。

## 参考资料

- [ASP.NET Core 10（最小 API 验证）](aspnet-core-10.md)
- [命名与 API 约定](../../standards/coding-conventions.md)
- 官方文档：[ASP.NET Core 模型验证](https://learn.microsoft.com/aspnet/core/mvc/models/validation)
- 官方文档：[最小 API 验证](https://learn.microsoft.com/aspnet/core/fundamentals/minimal-apis/validation)
