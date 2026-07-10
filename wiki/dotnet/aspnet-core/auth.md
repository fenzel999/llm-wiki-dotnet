---
title: 认证与授权（Authentication & Authorization）
summary: 认证确认"你是谁"，授权决定"你能做什么"；JWT/Cookie 认证配合基于策略的授权。
tags: [auth, authentication, authorization, jwt, policy, 安全]
introduced-in: general
applies-to: [all]
status: stable
source: https://learn.microsoft.com/aspnet/core/security/
updated: 2026-07-10
---

## 概述

两个词长得像，职责却完全不同：**认证（Authentication）**回答"你是谁"——校验凭据、建立用户身份（`ClaimsPrincipal`）；**授权（Authorization）**回答"你能做什么"——在已知身份的前提下判断是否放行。顺序上总是先认证、后授权。

ASP.NET Core 的认证是可插拔的"方案（scheme）"：Web 应用常用 **Cookie** 认证，API/前后端分离常用 **JWT Bearer** 令牌，企业场景接 OpenID Connect（对接 Entra ID、Keycloak 等）。授权推荐**基于策略（policy-based）**而非到处写角色字符串——策略把"需要满足的要求"集中定义，端点只引用策略名。net8+ 的最小 API 和控制器都用 `RequireAuthorization` / `[Authorize]` 声明保护。

## 正确做法

注册 JWT 认证与命名策略，端点按策略保护：

```csharp
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer();

builder.Services.AddAuthorization(options =>
    options.AddPolicy("AdminOnly", p => p.RequireRole("Admin")));

var app = builder.Build();
app.UseAuthentication();   // 必须在 UseAuthorization 之前
app.UseAuthorization();

app.MapGet("/admin/stats", () => "secret")
   .RequireAuthorization("AdminOnly");
```

复杂规则用自定义 `AuthorizationHandler` 表达"要求"，而不是在业务里散写 `if (user.Role == ...)`。

## 常见误区

❌ 把 `UseAuthorization()` 放在 `UseAuthentication()` 之前，或漏掉其一——授权拿不到身份，保护形同虚设。顺序：认证在前，授权在后。

❌ 用授权来做认证（或反之）——用角色判断代替身份校验，或反过来。分清"你是谁"与"你能干嘛"。

❌ 把 JWT 签名密钥硬编码进代码/仓库，或不校验令牌的签发者/受众/有效期。密钥进密钥保管库，校验参数要完整。

## 适用版本

认证/授权中间件全版本通用；基于策略的授权 net3.0+；最小 API 的 `RequireAuthorization` net7+。

## 参考资料

- [中间件管道](middleware.md)
- [ASP.NET Core 10](aspnet-core-10.md)
- 官方文档：[ASP.NET Core 安全性](https://learn.microsoft.com/aspnet/core/security/)
- 官方文档：[基于策略的授权](https://learn.microsoft.com/aspnet/core/security/authorization/policies)
