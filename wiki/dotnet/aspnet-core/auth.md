---
title: 认证与授权（Authentication & Authorization）
summary: 认证=你是谁，授权=你能做什么；JWT Bearer/Cookie/OIDC 方案与基于策略的授权，AOT 后端用 JWT。
tags: [auth, authentication, authorization, jwt, policy]
introduced-in: general
applies-to: [net8, net9, net10]
status: stable
source: https://learn.microsoft.com/aspnet/core/security/
updated: 2026-07-10
---

# 认证与授权（Authentication & Authorization）

> **要点速览**
> - **认证**=你是谁（校验凭据，建立 `ClaimsPrincipal`）；**授权**=你能干嘛（基于身份放行）。顺序永远先认证后授权。
> - 三种认证方案：**JWT Bearer**（API/前后端分离）、**Cookie**（传统 Web）、**OpenID Connect**（企业对接 IdP）。方案可插拔，可并存。
> - 授权用**基于策略**而非散写角色字符串；复杂规则用自定义 `AuthorizationHandler`。
> - **AOT 后端**：JWT Bearer ✅ 兼容；Cookie / OIDC ❌ 不兼容 Native AOT（[P16](../../governance/policy.md)）。AOT 服务用 JWT Bearer。

## 概述

两个词职责不同：**认证（Authentication）**回答"你是谁"——校验凭据、建立用户身份（`ClaimsPrincipal`）；**授权（Authorization）**回答"你能做什么"——在已知身份下判断是否放行。顺序上总是先认证、后授权。

ASP.NET Core 认证是**可插拔的方案（scheme）**。常见方案：

| 方案 | 典型场景 | Native AOT |
|------|----------|:----------:|
| **JWT Bearer** | API / 前后端分离 | ✅ 兼容 |
| **Cookie** | 传统服务端渲染 Web | ❌ 不支持 |
| **OpenID Connect** | 企业对接 Entra ID / Keycloak 等 IdP | ❌ 不支持 |

授权推荐**基于策略（policy-based）**：把"需要满足的要求"集中定义，端点只引用策略名，而不是各处散写角色判断。自定义要求用 `IAuthorizationHandler` 表达，不污染业务。

## 正确做法

### 1. 注册 JWT Bearer + 完整校验参数（API 首选）

```csharp
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(o => o.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true,   ValidateAudience = true,   ValidateLifetime = true,
        ValidIssuer = builder.Configuration["Jwt:Issuer"],
        ValidAudience = builder.Configuration["Jwt:Audience"],
    });

builder.Services.AddAuthorization(o => o.AddPolicy("AdminOnly", p => p.RequireRole("Admin")));
```

### 2. 中间件顺序：认证必须在授权之前

```csharp
var app = builder.Build();
app.UseAuthentication();   // 先：建立身份
app.UseAuthorization();    // 后：基于身份放行
app.MapGet("/admin/stats", () => "secret").RequireAuthorization("AdminOnly");
```

### 3. 复杂规则用自定义 `AuthorizationHandler`

```csharp
public sealed class MinimumAgeHandler(IConfiguration cfg) : IAuthorizationHandler
{
    public Task HandleAsync(AuthorizationHandlerContext ctx)
    {
        var dob = ctx.User.FindFirst(c => c.Type == "date_of_birth")?.Value;
        if (dob is not null && IsOver(DateTime.Parse(dob), 18))
            ctx.Succeed(ctx.PendingRequirements.First());
        return Task.CompletedTask;
    }
    private bool IsOver(DateTime dob, int years) => /* ... */ true;
}
builder.Services.AddSingleton<IAuthorizationHandler, MinimumAgeHandler>();
// 端点：.RequireAuthorization("Over18")
```

### 4. 多方案并存（如 API 用 JWT、Web 用 Cookie）

可注册多个 scheme，端点用策略 + `.RequireAuthorization(...)` 指定接受哪些（如 `builder.Services.AddAuthorization(o => o.AddPolicy("multi", p => p.AddAuthenticationSchemes("Bearer", "Cookies").RequireAuthenticatedUser()))` 后 `.RequireAuthorization("multi")`）；默认认证方案决定未显式指定时的行为。

## 常见误区

❌ **中间件顺序错**：`UseAuthorization()` 放在 `UseAuthentication()` 之前，或漏掉其一——授权拿不到身份，保护形同虚设。认证在前、授权在后。

❌ **用授权做认证**（或反之）：用角色判断代替身份校验，或反过来。区分"你是谁"与"你能干嘛"。

❌ **JWT 密钥硬编码进代码/仓库**，或不校验签发者/受众/有效期。密钥进密钥库（见 [Data Protection](../fundamentals/data-protection.md)），`TokenValidationParameters` 校验参数要完整。

❌ **复杂授权规则散写在业务里** `if (user.Role == "Admin")`——应抽成策略/`AuthorizationHandler`，业务代码只声明需求。

❌ **AOT 后端用 Cookie / OIDC 认证**。二者不支持 Native AOT（[P16](../../governance/policy.md)、[AOT 矩阵](../aot/aot-compatibility.md)）。AOT 服务选 **JWT Bearer**；非 AOT 的 Web 应用才用 Cookie/OIDC。

## 适用版本

认证/授权中间件全版本通用；基于策略授权 net3.0+；最小 API `RequireAuthorization` net7+；JWT Bearer 的源生成友好性随 net8+ 完善。

### Native AOT 兼容性

**JWT Bearer 认证兼容 Native AOT**（[P16](../../governance/policy.md)、[AOT 矩阵](../aot/aot-compatibility.md)）；但 **Cookie 认证与 OpenID Connect 不兼容 AOT**，且 MVC 控制器也不兼容——AOT 发布的应用应走 Minimal API + JWT Bearer。授权中间的**策略评估、自定义 `AuthorizationHandler`** 本身是普通 C# 逻辑、AOT 安全；注意不要在其中用反射。

## 参考资料

- [中间件管道（认证/授权顺序）](middleware.md) · [安全加固与机密](../fundamentals/data-protection.md)
- [ASP.NET Core 10（最小 API）](aspnet-core-10.md) · [AOT 兼容性矩阵](../aot/aot-compatibility.md)
- 官方文档：[ASP.NET Core 安全性](https://learn.microsoft.com/aspnet/core/security/) · [基于策略的授权](https://learn.microsoft.com/aspnet/core/security/authorization/policies)
