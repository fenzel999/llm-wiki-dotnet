---
title: Minimal API 组织模式（Minimal API Organization）
summary: 用 MapGroup 对 Minimal API 进行分组与模块化，直接注入 DbContext，不用 Controller。
tags: [pattern, aspnet-core, minimal-api]
introduced-in: general
applies-to: [all]
status: stable
source: https://learn.microsoft.com/aspnet/core/fundamentals/minimal-apis
updated: 2026-07-10
---

## 概述

本项目统一使用 Minimal API 组织 HTTP 端点，不引入 Controller。借助 `MapGroup` 做路由分组、统一前缀与中间件（如鉴权），并按业务模块拆分到多个 `MapXXX` 扩展方法中，使 `Program.cs` 保持精简；数据访问直接注入 `DbContext`（EF Core 本就是仓储 + 工作单元，不再额外抽象），并接入原生 OpenAPI 3.1。当你需要按模块分组、统一前缀/鉴权/版本时，`MapGroup` 最为合适；但当端点数量极少、无需任何分组时，直接在 `Program` 内联定义反而更简单，不必强行拆模块。

## 正确做法

在 `Program.cs` 中注册服务与文档端点（本项目使用 .NET 10 原生 OpenAPI 3.1，不使用 Swashbuckle），再把端点逻辑分流到独立模块：

```csharp
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);
builder.Services.AddDbContext<AppDbContext>(o => o.UseSqlServer(builder.Configuration.GetConnectionString("Db")));
builder.Services.AddOpenApi();   // .NET 10 原生 OpenAPI 3.1，不使用 Swashbuckle

var app = builder.Build();
app.MapOpenApi();                // 暴露 /openapi/v1.json

app.MapOrderEndpoints();
app.MapHealthEndpoints();

app.Run();
```

将端点逻辑拆到独立模块，保证 `Program` 精简；直接在 handler 中消费 `AppDbContext`：

```csharp
public static class OrderEndpoints
{
    public static IEndpointRouteBuilder MapOrderEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/orders")
                       .WithTags("Orders")
                       .WithOpenApi();   // 接入 OpenAPI 文档

        group.MapGet("/", async (AppDbContext db, CancellationToken ct) =>
            Results.Ok(await db.Orders.ToListAsync(ct)));

        group.MapPost("/", async (CreateOrderRequest req, AppDbContext db, CancellationToken ct) =>
        {
            if (string.IsNullOrWhiteSpace(req.CustomerId))
                return Results.BadRequest("客户标识不能为空");

            var order = new Order(req.CustomerId, req.Items);
            db.Orders.Add(order);
            await db.SaveChangesAsync(ct);   // EF Core 的 unit-of-work：一次提交
            return Results.Created($"/api/orders/{order.Id}", order);
        });

        return app;
    }
}
```

当端点需要表达多种可能的响应类型时，用内置的类型化联合让 OpenAPI 能生成对应状态码。下面的写法同时声明了 200 与 404 两种响应：

```csharp
group.MapGet("/{id:guid}", async (Guid id, AppDbContext db, CancellationToken ct) =>
    await db.Orders.FindAsync(new object[] { id }, ct) is { } order
        ? Results.Ok(order)
        : Results.NotFound())
    .Produces<Order>(StatusCodes.Status200OK)
    .ProducesProblem(StatusCodes.Status404NotFound);
```

## 反例（常见错误）

❌ 自定义一个 `Result<T>` 泛型联合类型，与 Minimal API 内置的 `Results<T>`/`TypedResults` 语义重复：

```csharp
public record Result<T>(bool IsSuccess, T? Value, string? Error); // 重复造轮子
```

- 引入 Controller：本项目约定全部端点使用 Minimal API，不应混用 Controller 风格。
- 额外封装 Repository/工作单元包裹 `DbContext`：那是对 EF Core 的重复抽象。
- 把所有端点堆在一个巨型文件里：应按模块拆分到独立扩展方法，保持可维护性。
- 在 handler 中返回原始对象而不声明 `Produces`，导致 OpenAPI 文档缺少响应结构。

## 适用版本

所有受支持版本通用，无差异。其中 `.NET 10` 起使用原生 OpenAPI 3.1（见 [OpenAPI 3.1](../dotnet/aspnet-core/aspnet-core-10.md#openapi-3-1)），不使用 Swashbuckle。

## 参考资料

- 相关：[OpenAPI 3.1（aspnet-core）](../dotnet/aspnet-core/aspnet-core-10.md#openapi-3-1)
- 相关：[EF Core 数据访问（不用 Repository/工作单元）](../dotnet/ef-core/ef-data-access.md)
- 相关：[依赖注入](../concepts/dependency-injection.md)
- 官方文档：[ASP.NET Core Minimal API](https://learn.microsoft.com/aspnet/core/fundamentals/minimal-apis)
