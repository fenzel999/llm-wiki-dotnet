---
title: 最小 API 组织模式（Minimal API Organization）
summary: 用 MapGroup 对最小 API 进行分组与模块化，并对接 OpenAPI。
tags: [pattern, aspnet-core, minimal-api]
introduced-in: general
applies-to: [all]
status: stable
source: sources/README.md
updated: 2026-07-09
---

## 意图

用最小 API（minimal API）而非 Controller 组织 HTTP 端点，借助 `MapGroup` 做路由分组、统一前缀与中间件（如鉴权），按业务模块拆分到多个 `MapXXX` 扩展方法，并接入 [OpenAPI 3.1（aspnet-core）](../dotnet/aspnet-core/openapi-3-1.md)。

## 正确做法

在 `Program.cs` 中集中挂载分组：

```csharp
using Microsoft.AspNetCore.Builder;

var builder = WebApplication.CreateBuilder(args);
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

var orders = app.MapGroup("/api/orders").WithTags("Orders");
orders.MapGet("/", GetOrders);
orders.MapPost("/", CreateOrder);

var health = app.MapGroup("/health");
health.MapGet("/", () => Results.Ok("healthy"));

app.Run();
```

把端点逻辑抽到独立模块，保持 `Program` 精简：

```csharp
public static class OrderEndpoints
{
    public static IEndpointRouteBuilder MapOrderEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/orders").WithTags("Orders");

        group.MapGet("/", async (IOrderRepository repo, CancellationToken ct) =>
            Results.Ok(await repo.GetAllAsync(ct)));

        group.MapPost("/", async (CreateOrderRequest req, IOrderRepository repo, CancellationToken ct) =>
        {
            var result = OrderFactory.Create(req);
            if (!result.IsSuccess)
                return Results.BadRequest(result.Error!.Message);

            await repo.AddAsync(result.Value!, ct);
            return Results.Created($"/api/orders/{result.Value!.Id}", result.Value);
        });

        return app;
    }
}
```

在 `Program` 中调用扩展方法：

```csharp
app.MapOrderEndpoints();
```

## 何时使用 / 何时不用

- 使用：微服务、轻量 API、快速原型，端点数量适中。
- 使用：需按模块分组、统一前缀/鉴权/版本时，`MapGroup` 最合适。
- 不用：端点极多或需要复杂模型绑定时，传统 Controller 可能更易组织。
- 不用：不要在一个巨文件里堆所有端点，按模块拆分扩展方法（见 [仓储](../patterns/repository.md) 解耦数据）。

## 参考资料

- [OpenAPI 3.1（aspnet-core）](../dotnet/aspnet-core/openapi-3-1.md)
- [依赖注入](../concepts/dependency-injection.md)
- [仓储](../patterns/repository.md)
- [Result 类型](../patterns/result-type.md)

