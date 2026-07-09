---
title: 最小 API 组织模式（Minimal API Organization）
summary: 用 MapGroup 对最小 API 进行分组与模块化，直接注入 DbContext，不用 Controller。
tags: [pattern, aspnet-core, minimal-api]
introduced-in: general
applies-to: [all]
status: stable
source: sources/README.md
updated: 2026-07-09
---

## 意图

本项目 **统一使用最小 API（Minimal API）组织 HTTP 端点，不使用 Controller**。借助 `MapGroup`
做路由分组、统一前缀与中间件（如鉴权），按业务模块拆分到多个 `MapXXX` 扩展方法；数据访问
**直接注入 `DbContext`**（EF Core 已是仓储 + 工作单元，不另加抽象），并接入
[原生 OpenAPI 3.1](../dotnet/aspnet-core/openapi-3-1.md)。

## 正确做法

在 `Program.cs` 中注册服务与文档端点（**无 Swagger**）：

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

把端点逻辑抽到独立模块，保持 `Program` 精简；直接消费 `AppDbContext`：

```csharp
public static class OrderEndpoints
{
    public static IEndpointRouteBuilder MapOrderEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/orders")
                       .WithTags("Orders")
                       .WithOpenApi();   // 纳入 OpenAPI 文档

        group.MapGet("/", async (AppDbContext db, CancellationToken ct) =>
            Results.Ok(await db.Orders.ToListAsync(ct)));

        group.MapPost("/", async (CreateOrderRequest req, AppDbContext db, CancellationToken ct) =>
        {
            var order = OrderFactory.Create(req);
            if (!order.IsSuccess)
                return Results.BadRequest(order.Error!.Message);

            db.Orders.Add(order.Value!);
            await db.SaveChangesAsync(ct);   // EF Core 的单元-of-work：一次提交
            return Results.Created($"/api/orders/{order.Value!.Id}", order.Value);
        });

        return app;
    }
}
```

## 何时使用 / 何时不用

- 使用：微服务、轻量 API、快速原型，端点数量适中。
- 使用：需按模块分组、统一前缀/鉴权/版本时，`MapGroup` 最合适。
- 使用：数据访问直接注入 `AppDbContext`，由 EF Core 负责持久化与事务。
- 不用：**不要引入 Controller**——本项目约定全部端点走最小 API。
- 不用：不要另写仓储（Repository）/工作单元（Unit of Work）包装 `DbContext`，那是重复抽象。
- 不用：不要在一个巨文件里堆所有端点，按模块拆分扩展方法。

## 参考资料

- [OpenAPI 3.1（aspnet-core）](../dotnet/aspnet-core/openapi-3-1.md)
- [EF Core 数据访问（不用仓储/工作单元）](../dotnet/ef-core/ef-data-access.md)
- [依赖注入](../concepts/dependency-injection.md)
- [Result 类型](../concepts/result-type.md)
