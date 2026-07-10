---
title: 中间件管道（Middleware Pipeline）
summary: 请求穿过有序中间件管道；顺序即行为；自定义中间件两种写法；异常处理在最外层、限流/认证授权按序。
tags: [middleware, pipeline, aspnet-core]
introduced-in: general
applies-to: [net8, net9, net10]
status: stable
source: https://learn.microsoft.com/aspnet/core/fundamentals/middleware/
updated: 2026-07-10
---

# 中间件管道（Middleware Pipeline）

> **要点速览**
> - 请求穿过有序管道：每个中间件可处理请求/响应，或**短路**（不调 `next`）。
> - **顺序即行为**：异常处理最外、认证在授权前、终结点在最后。
> - 两种自定义：内联 `app.Use(...)`（轻量）或**约定类**（`InvokeAsync(HttpContext, RequestDelegate)`，可注入依赖、可测试）。
> - 响应一旦开始就不能改状态码/头；`MapWhen`/`UseWhen` 按条件分支。
> - 中间件**完全兼容 Native AOT**（用 Minimal API 风格）。

## 概述

ASP.NET Core 处理每个请求的方式，是让它穿过一条**中间件管道**：请求从第一个中间件进入、逐个向后传递，到达终结点后再逆序返回。每个中间件都能做两件事——调用 `next` 之前处理请求、在 `next` 返回之后处理响应，或干脆**短路**（不调 `next`，直接返回响应）。异常处理、HTTPS 重定向、静态文件、路由、认证、授权、限流、终结点，全都是管道上的一环。

最关键的一点：**顺序即行为**。`UseAuthentication` 必须在 `UseAuthorization` 之前，异常处理必须放在最前面才能兜住后面所有环节。装配顺序错了，功能就静默失效。

## 正确做法

### 1. 推荐顺序（net8+ 通用模板）

```csharp
var app = builder.Build();

app.UseExceptionHandler();        // ① 最外层，兜住后续所有异常
app.UseHttpsRedirection();
app.UseStaticFiles();
app.UseRouting();
app.UseRateLimiter();             // ③ 限流在认证/授权前后皆可，通常在路由后
app.UseAuthentication();          // ④ 认证在授权之前
app.UseAuthorization();           // ⑤
app.MapControllers();             // ⑥ 终结点在最后
app.Run();
```

### 2. 轻量逻辑用内联 `Use`

```csharp
app.Use(async (context, next) =>
{
    var sw = Stopwatch.StartNew();
    await next();                                  // 调用下一个；不调用即短路
    logger.LogInformation("{Path} took {Ms}ms", context.Request.Path, sw.ElapsedMilliseconds);
});
```

### 3. 可注入依赖、可测试：约定类中间件

```csharp
public sealed class RequestIdMiddleware
{
    private readonly RequestDelegate _next;
    public RequestIdMiddleware(RequestDelegate next) => _next = next;   // 构造注入 RequestDelegate

    public async Task InvokeAsync(HttpContext ctx, ILogger<RequestIdMiddleware> log)
    {
        ctx.Response.Headers["X-Request-Id"] = Guid.NewGuid().ToString();
        await _next(ctx);                          // 不短路，放行
    }
}
app.UseMiddleware<RequestIdMiddleware>();          // 注册（自动解析依赖）
```

> 也可实现 `IMiddleware`（需显式注册到 DI），两种写法都能注入服务、便于单元测试。

### 4. 按条件分支：`MapWhen` / `UseWhen`

```csharp
app.UseWhen(ctx => ctx.Request.Headers.ContainsKey("X-Internal"),
    branch => branch.Use(async (c, n) => { c.Items["internal"] = true; await n(); }));

app.MapWhen(ctx => ctx.Request.Path.StartsWithSegments("/legacy"),
    branch => branch.UseMiddleware<LegacyAdapter>());   // 仅该路径进入分支管道
```

## 常见误区

❌ **装配顺序错乱**——`UseAuthorization` 放 `UseRouting` 之前，或异常处理放中间。保护失效/异常兜不住。牢记官方顺序。

❌ **中间件里调 `next` 后又写已发送的响应头**——抛"响应已开始"。响应一旦开始就不能再改状态码/头。

❌ **用 `Run`（终结中间件）却放管道中间**，后面永远执行不到。`Run` 表示"到此为止"，只放末端。

❌ **在中间件里做重活/阻塞调用**（同步读文件、长计算）拖慢整条管道。重活放到后台服务或异步做。

❌ **短路却不设状态码**——直接 `await context.Response.WriteAsync(...)` 但忘了 `context.Response.StatusCode = 401`，客户端拿到 200。短路也要返回正确状态码（见 [异常处理](exception-handling.md)）。

## 适用版本

中间件管道全版本通用；`UseExceptionHandler` 无 lambda 重载等便捷 API net8+ 更完善；`MapWhen`/`UseWhen` 通用。

### Native AOT 兼容性

中间件机制**完全兼容 Native AOT**（✅，[P16](../../governance/policy.md)、[AOT 矩阵](../aot/aot-compatibility.md)）——前提是 Web 层用 **Minimal API**（MVC/控制器不支持 AOT）。约定类中间件（构造函数 + `InvokeAsync`）、内联 `app.Use`、分支 `MapWhen`/`UseWhen` 均为 AOT 安全；注入的依赖经由显式 DI 注册即可。

## 参考资料

- [全局异常处理（异常中间件在最外层）](exception-handling.md) · [认证与授权（顺序）](auth.md)
- [限流（UseRateLimiter 位置）](rate-limiting.md) · [ASP.NET Core 10（最小 API）](aspnet-core-10.md)
- [AOT 兼容性矩阵](../aot/aot-compatibility.md)
- 官方文档：[ASP.NET Core 中间件](https://learn.microsoft.com/aspnet/core/fundamentals/middleware/) · [中间件顺序](https://learn.microsoft.com/aspnet/core/fundamentals/middleware/#middleware-order)
