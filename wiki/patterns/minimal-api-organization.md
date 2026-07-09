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

> 约定：**不自己造 `Result<T>` 类型**。最小 API 已有内建的 **`Results<TResult1, ...>` /
> `TypedResults`** 作为类型化返回联合，承担「成功/失败多种响应」的表达，无需重复实现一个
> `Result<T>`。

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
            if (string.IsNullOrWhiteSpace(req.CustomerId))
                return Results.BadRequest("客户标识不能为空");

            var order = new Order(req.CustomerId, req.Items);
            db.Orders.Add(order);
            await db.SaveChangesAsync(ct);   // EF Core 的单元-of-work：一次提交
            return Results.Created($"/api/orders/{order.Id}", order);
        });

        return app;
    }
}
```

若端点需要**多种可能的响应类型**，用内建类型化联合明确声明（这也是 OpenAPI 生成多状态码的依据）：

```csharp
group.MapGet("/{id:guid}", async (Guid id, AppDbContext db, CancellationToken ct) =>
    await db.Orders.FindAsync(new object[] { id }, ct) is { } order
        ? Results.Ok(order)
        : Results.NotFound())
    .Produces<Order>(StatusCodes.Status200OK)
    .ProducesProblem(StatusCodes.Status404NotFound);
```

## 类型化返回：Results<T> / TypedResults

`Results<...>` 是 .NET 为最小 API 提供的**内建返回类型联合**，等价于「一个端点可能返回 Ok / NotFound /
BadRequest / Created 等多种带类型的响应」：

```csharp
// 返回类型写成联合，调用方与 OpenAPI 都能看到所有可能结果
static Results<Ok<Order>, NotFound, BadRequest<ProblemDetails>> Get(Guid id, AppDbContext db)
{
    var order = db.Orders.Find(id);
    return order is null
        ? TypedResults.NotFound()
        : TypedResults.Ok(order);
}
```

- 用 `Results.Ok/TypedResults.Ok`、`NotFound`、`BadRequest`、`Created` 等静态工厂构造具体响应。
- 需要校验失败的结构化错误时，返回 `BadRequest<ProblemDetails>`（与 .NET 10 内置验证的错误格式一致，见
  [最小 API 验证](../dotnet/aspnet-core/minimal-api-validation.md)）。
- **不要**再定义 `Result<T>`/`Either<T>` 之类的自定义联合类型——它与 `Results<T>` 语义重复、徒增概念负担。

## 何时使用 / 何时不用

- 使用：微服务、轻量 API、快速原型，端点数量适中。
- 使用：需按模块分组、统一前缀/鉴权/版本时，`MapGroup` 最合适。
- 使用：数据访问直接注入 `AppDbContext`，由 EF Core 负责持久化与事务。
- 不用：**不要引入 Controller**——本项目约定全部端点走最小 API。
- 不用：不要另写仓储（Repository）/工作单元（Unit of Work）包装 `DbContext`，那是重复抽象。
- 不用：不要自造 `Result<T>` 类型——用 `Results<T>`/`TypedResults` 表达多响应。
- 不用：不要在一个巨文件里堆所有端点，按模块拆分扩展方法。

## 参考资料

- [OpenAPI 3.1（aspnet-core）](../dotnet/aspnet-core/openapi-3-1.md)
- [EF Core 数据访问（不用仓储/工作单元）](../dotnet/ef-core/ef-data-access.md)
- [最小 API 验证](../dotnet/aspnet-core/minimal-api-validation.md)
- [依赖注入](../concepts/dependency-injection.md)
