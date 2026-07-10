---
title: 中间件管道（Middleware Pipeline）
summary: 请求经过一条有序的中间件管道，每个中间件可短路或调用 next 继续，顺序决定行为。
tags: [middleware, pipeline, aspnetcore, 请求管道]
introduced-in: general
applies-to: [all]
status: stable
source: https://learn.microsoft.com/aspnet/core/fundamentals/middleware/
updated: 2026-07-10
---

> **要点速览**
> - 请求穿过有序管道，每个中间件可处理请求/响应，或短路（不调用 `next`）。
> - **顺序即行为**：异常处理最外、认证在授权前、终结点在最后。
> - 轻量逻辑用内联 `app.Use(...)`；`Run` 表示到此为止，只放末端。
> - 响应一旦开始就不能再改状态码/头。

## 概述

ASP.NET Core 处理每个请求的方式，是让它穿过一条**中间件管道**：请求从第一个中间件进入，逐个向后传递，到达终结点后再逆序返回。每个中间件都能做两件事——在调用 `next` 之前处理请求、在 `next` 返回之后处理响应，或者干脆**短路**（不调用 `next`，直接返回响应）。异常处理、HTTPS 重定向、静态文件、路由、认证、授权、终结点，全都是管道上的一环。

最关键、也最容易踩坑的一点是：**顺序即行为**。`UseAuthentication` 必须在 `UseAuthorization` 之前，异常处理中间件必须放在最前面才能兜住后面所有环节的异常。装配顺序错了，功能就静默失效。

## 正确做法

按官方推荐顺序装配管道，异常处理在最外层、认证在授权之前、终结点在最后：

```csharp
var app = builder.Build();

app.UseExceptionHandler("/error");   // 最外层，兜住后续所有异常
app.UseHttpsRedirection();
app.UseStaticFiles();
app.UseRouting();
app.UseAuthentication();             // 认证在授权之前
app.UseAuthorization();
app.MapControllers();                // 终结点在最后

app.Run();
```

自定义横切逻辑用内联 `Use` 或独立中间件类；轻量逻辑用内联即可：

```csharp
app.Use(async (context, next) =>
{
    var sw = Stopwatch.StartNew();
    await next();                    // 调用下一个；不调用即短路
    logger.LogInformation("{Path} took {Ms}ms", context.Request.Path, sw.ElapsedMilliseconds);
});
```

## 常见误区

❌ 装配顺序错乱——比如把 `UseAuthorization` 放在 `UseRouting` 之前，或异常处理放在中间。结果是保护失效或异常兜不住。牢记官方顺序。

❌ 在中间件里调用 `next` 之后又去写已经发送的响应头，抛"响应已开始"异常。响应一旦开始就不能再改状态码/头。

❌ 用 `Run`（终结中间件）却放在管道中间，后面的中间件永远执行不到。`Run` 表示"到此为止"，只放末端。

## 适用版本

中间件管道全版本通用；`UseExceptionHandler` 无 lambda 重载等便捷 API net8+ 更完善。

## 参考资料

- [认证与授权](auth.md)
- [ASP.NET Core 10](aspnet-core-10.md)
- 官方文档：[ASP.NET Core 中间件](https://learn.microsoft.com/aspnet/core/fundamentals/middleware/)
- 官方文档：[中间件顺序](https://learn.microsoft.com/aspnet/core/fundamentals/middleware/#middleware-order)
