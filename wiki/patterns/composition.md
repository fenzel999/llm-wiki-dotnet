---
title: 组合与架构模式
summary: 把 Options、泛型主机、管道行为、最小 API 组织这四个常用模式串起来讲——它们如何彼此衔接，以及各自适合什么场景。
tags: [pattern, configuration, hosting, pipeline, aspnet-core, minimal-api, cross-cutting]
introduced-in: general
applies-to: [all]
status: stable
source: https://learn.microsoft.com/dotnet/core/extensions/options
updated: 2026-07-10
---

> **要点速览**
> - 四个组合模式：Options、泛型主机、管道行为、最小 API 组织。
> - 用组合而非继承拼装横切能力；依赖经构造函数注入。
> - 配置绑定用 Options；跨切面逻辑用管道行为串接。

## 概述

写 .NET 应用的时候，你迟早会遇到几类反复出现的问题：配置从哪儿来、长驻服务怎么托管、横切逻辑（日志、验证、事务）往哪儿放、HTTP 端点怎么组织。它们看起来是四件不相干的事，其实常常出现在同一个项目里，并且彼此咬合——配置要靠宿主读进来，横切逻辑包在请求处理外面，端点又直接吃着注入进来的配置和数据库上下文。

这一页把四个最常被一起用到的模式放在一处讲：Options 模式负责把配置变成强类型对象；泛型主机（Generic Host）负责把配置、日志、依赖注入统一托管起来，尤其适合后台服务；管道行为（Pipeline Behavior）负责把日志、验证、事务这类横切关注点从业务代码里剥离；最小 API 组织则负责把 HTTP 端点按模块清爽地铺开，不再需要 Controller。

读的时候不必按小节顺序硬啃。你可以把它当成一份「什么时候用哪个」的地图：先搞清楚自己要解决的是配置、托管、横切还是端点组织，再跳到对应小节看动机和反例。它们之间若有衔接，文内会直接指出。

## Options 模式 {#options-pattern}

先说配置。几乎每个项目都要读配置：`appsettings.json`、环境变量、命令行参数，乃至 Key Vault 之类的远端配置源。最朴素的写法是哪里要用就在哪里 `Configuration["Notification:SmtpHost"]` 取一下——但这样的字符串键散落在业务代码各处，拼写错了只有在运行期才会爆出来，而且完全谈不上类型安全和集中校验。

Options 模式正是用来收拾这种局面的：它把配置源绑定到一个强类型（strongly-typed）类，通过 `IOptions` / `IOptionsSnapshot` / `IOptionsMonitor` 注入到需要的地方，并在启动时完成校验。当你需要在多处共享一组结构化设置、又希望获得类型安全与启动期校验时，就该用它；相反，零星的一次性取值直接读 `Configuration["Key"]` 并无不可，只是要接受它会丧失类型安全与校验。至于机密信息（密钥、连接串），则应当走 Secret Manager / 环境变量，绝不要写进源码或提交到仓库。

先定义配置类，并为对应的配置节声明一个 `Section` 常量，后面绑定和读取都靠它，避免重复写字符串：

```csharp
namespace App.Config;

public sealed class NotificationOptions
{
    public const string Section = "Notification";

    public string SmtpHost { get; set; } = string.Empty;
    public int Port { get; set; } = 587;
    public string From { get; set; } = string.Empty;
}
```

然后通过 `AddOptions<T>()` 把配置节绑上来、挂上 DataAnnotations 校验，并在启动时就校验，让错误配置在运行之前就失败，而不是等到真正发邮件时才炸：

```csharp
using Microsoft.Extensions.Options;

builder.Services.AddOptions<NotificationOptions>()
    .Bind(builder.Configuration.GetSection(NotificationOptions.Section))
    .ValidateDataAnnotations()
    .ValidateOnStart();

// 使用 IOptionsSnapshot（每次请求重新读取，适合可热更新配置）
public sealed class Notifier
{
    private readonly NotificationOptions _options;
    public Notifier(IOptionsSnapshot<NotificationOptions> options)
        => _options = options.Value;

    public void Send(string to, string body)
        => Console.WriteLine($"[{_options.SmtpHost}:{_options.Port}] -> {to}");
}
```

校验本身借助 DataAnnotations 标注在属性上，框架会在启动期拦截非法配置：

```csharp
using System.ComponentModel.DataAnnotations;

public sealed class NotificationOptions
{
    public const string Section = "Notification";

    [Required] public string SmtpHost { get; set; } = string.Empty;
    [Range(1, 65535)] public int Port { get; set; } = 587;
    [Required, EmailAddress] public string From { get; set; } = string.Empty;
}
```

❌ 下面是典型的反面教材——直接在业务代码里散落字符串键取值，既失去类型安全，也失去了集中校验的机会：

```csharp
var host = Configuration["Notification:SmtpHost"]; // 拼写错误仅在运行期暴露
var port = int.Parse(Configuration["Notification:Port"]); // 无校验、易崩溃
```

还有几个常被踩的坑：

- **用错接口**：单例服务需要实时感知配置变更，却用了 `IOptions`（它只在启动时读一次），应当改用 `IOptionsMonitor`。
- **把机密写进 `appsettings.json`**：应走 Secret Manager / 环境变量。
- **忽略 `ValidateOnStart`**：错误配置要等到运行时才暴露，而非启动即失败。

Options 模式几乎总是和[依赖注入](../dotnet/fundamentals/dependency-injection.md)一起出现，也常被[泛型主机](#generic-host)在启动阶段顺手绑定好。它对所有受支持的 .NET 版本通用，没有版本差异。

## 泛型主机 {#generic-host}

配置有了，下一个问题是：谁来读它、谁来跑长时间运行的逻辑？当你写一个控制台程序、消息消费者、定时作业或守护进程，希望复用和 ASP.NET Core 一致的配置 / 日志 / DI 体系时，泛型主机（Generic Host）就是为此而生的。它把配置、日志与[依赖注入](../dotnet/fundamentals/dependency-injection.md)统一托管起来，并对外暴露一套应用生命周期（lifetime）钩子，让你能优雅地响应关闭信号。

反过来，如果一个工具只是「跑一次就退出的短命令」，既不需要 DI 也不需要后台循环，那直接用 `Main` 写完就行了，没必要为了用而引入整个宿主——那只会徒增复杂度。

通过 `Host.CreateApplicationBuilder` 创建构建器，它已经自动接好了 `appsettings.json`、环境变量和命令行参数。下面的示例同时展示了绑定强类型配置、加控制台日志、注册一个后台服务这三条典型动作：

```csharp
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

var builder = Host.CreateApplicationBuilder(args);

// 配置：自动读取 appsettings.json、环境变量、命令行
builder.Services.AddOptions<WorkerOptions>()
    .Bind(builder.Configuration.GetSection(WorkerOptions.Section))
    .ValidateOnStart();

// 日志：默认控制台等提供程序已接入
builder.Logging.AddConsole();

// 注册后台服务
builder.Services.AddHostedService<MyWorker>();

using var host = builder.Build();
await host.RunAsync();
```

后台服务通过继承 `BackgroundService` 实现，重点是要正确响应取消令牌，并在退出时把异步资源释放干净。下面的 `MyWorker` 在收到取消信号之前周期性地打印心跳：

```csharp
public sealed class MyWorker : BackgroundService
{
    private readonly ILogger<MyWorker> _logger;
    private readonly WorkerOptions _options;
    public MyWorker(ILogger<MyWorker> logger, IOptions<WorkerOptions> options)
        => (_logger, _options) = (logger, options.Value);

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            _logger.LogInformation("心跳间隔 {Interval}s", _options.IntervalSeconds);
            await Task.Delay(TimeSpan.FromSeconds(_options.IntervalSeconds), stoppingToken);
        }
    }
}

public sealed class WorkerOptions
{
    public const string Section = "Worker";
    public int IntervalSeconds { get; set; } = 30;
}
```

可以看到，`MyWorker` 直接吃进了上一个小节讲过的 `IOptions<WorkerOptions>`——这就是几个模式咬合的地方：配置由 Options 模式绑定，由主机在启动时读入并校验，再注给后台服务。生命周期方面，按下 Ctrl+C 或收到 SIGTERM 会触发 `stoppingToken` 取消，`RunAsync` 在优雅关闭后返回；若需要在退出前释放资源，可以结合[释放与 using](disposable-using.md)模式处理。

❌ 反面教材：在 `ExecuteAsync` 里不处理异常，一旦里面抛错，整个宿主会被直接拖垮：

```csharp
protected override async Task ExecuteAsync(CancellationToken stoppingToken)
{
    await DoWorkAsync(stoppingToken); // 抛异常会终止整个宿主
}
```

另外两个常见错误：

- **忽略 `stoppingToken`**：循环不检查取消信号，关闭时无法优雅退出，资源也来不及释放。
- **过度设计**：为无需后台循环与 DI 的短工具引入整个宿主。

泛型主机对受支持版本通用，无差异。

## 管道行为 {#pipeline-behavior}

当项目里有了请求 / handler，你很快就会意识到：日志、验证、事务、性能度量这类横切关注点（cross-cutting concern）几乎每个 handler 都需要，但又不属于任何一条业务逻辑本身。把它们逐条写进 handler，代码会迅速变脏；而管道行为模式（Pipeline Behavior）的思路，是把这些逻辑抽出来，以管道的方式统一「包裹」在请求处理之外，让 handler 只管核心。

实现它**不需要任何第三方中介库**（[P10](../governance/policy.md) 不引 MediatR 之类）：只要定义一个自己的极简 handler 接口，再用**装饰器（decorator）**把横切逻辑一层层包在真实 handler 外面即可，思路和"管道"完全一致。当你有多条请求 / handler 共享同一类横切逻辑、又希望 handler 保持精简时，这非常合适；但如果某段逻辑只属于某一个 handler 特有，硬塞进通用管道反而增加理解成本，那就老老实实写在 handler 内部。

先定义一个自己的 handler 抽象——一个接口足矣：

```csharp
public interface IRequestHandler<in TRequest, TResponse>
{
    Task<TResponse> Handle(TRequest request, CancellationToken ct);
}
```

日志装饰器包住内层 handler，在请求处理前后各记一条：

```csharp
using Microsoft.Extensions.Logging;

public sealed class LoggingHandler<TRequest, TResponse>(
    IRequestHandler<TRequest, TResponse> inner,
    ILogger<LoggingHandler<TRequest, TResponse>> logger)
    : IRequestHandler<TRequest, TResponse>
{
    public async Task<TResponse> Handle(TRequest request, CancellationToken ct)
    {
        logger.LogInformation("处理请求 {Request}", typeof(TRequest).Name);
        var response = await inner.Handle(request, ct);   // 调用被包裹的下一层
        logger.LogInformation("完成请求 {Request}", typeof(TRequest).Name);
        return response;
    }
}
```

事务装饰器把整个内层 handler 包进一个数据库事务里，提交或回滚都交给 EF Core 管理：

```csharp
public sealed class TransactionHandler<TRequest, TResponse>(
    IRequestHandler<TRequest, TResponse> inner, AppDbContext db)
    : IRequestHandler<TRequest, TResponse>
{
    public async Task<TResponse> Handle(TRequest request, CancellationToken ct)
    {
        await using var tx = await db.Database.BeginTransactionAsync(ct);
        var response = await inner.Handle(request, ct);
        await db.SaveChangesAsync(ct);
        await tx.CommitAsync(ct);
        return response;
    }
}
```

注意这里用的是 `await using`——事务的提交和释放走的是异步路径，这正好呼应了[释放与 using](disposable-using.md)里讲的 `IAsyncDisposable`。注册时用[依赖注入](../dotnet/fundamentals/dependency-injection.md)手动把装饰器一层层套上：最外层最先执行，所以按"先记日志、再开事务"的顺序，让日志包在事务外面：

```csharp
builder.Services.AddScoped<PlaceOrderHandler>();          // 真实 handler
builder.Services.AddScoped<IRequestHandler<PlaceOrder, OrderDto>>(sp =>
    new LoggingHandler<PlaceOrder, OrderDto>(             // 最外层：先执行
        new TransactionHandler<PlaceOrder, OrderDto>(     // 内层：再开事务
            sp.GetRequiredService<PlaceOrderHandler>(),
            sp.GetRequiredService<AppDbContext>()),
        sp.GetRequiredService<ILogger<LoggingHandler<PlaceOrder, OrderDto>>>()));
```

❌ 顺序错了就很要命：下面把事务装饰器套在最外层、验证套在里面，意味着哪怕请求根本不合法，也会先开一个数据库事务，白白占用连接：

```csharp
new TransactionHandler<PlaceOrder, OrderDto>(   // 错误：事务在最外层先开
    new ValidationHandler<PlaceOrder, OrderDto>(real, ...), db);  // 验证反而在事务内
```

其它常见坑：

- **把单个 handler 特有的逻辑硬塞进通用管道**：直接写在 handler 内更清晰。
- **忽略装饰顺序**：验证、鉴权等前置逻辑应包在事务 / 业务之外（更靠外层）。
- **在行为里吞掉异常或返回错误响应却不记录**：问题会难以排查。

管道行为对所有受支持版本通用，无差异。

## 最小 API 组织 {#minimal-api-organization}

最后落到 HTTP 端点。ASP.NET Core 提供了两套主流写法：传统的 Controller 和 Minimal API。本项目约定统一使用 Minimal API 组织端点，不引入 Controller——理由很简单，端点少而直接时，Minimal API 更贴近路由本身，没有一层基类和分析器的额外重量。

借助 `MapGroup` 做路由分组、统一前缀与中间件（比如鉴权），再把端点按业务模块拆到多个 `MapXXX` 扩展方法里，就能让 `Program.cs` 始终薄薄一层。数据访问则直接注入 `DbContext`——EF Core 本身就是仓储 + 工作单元，没必要再包一层。当你需要按模块分组、统一前缀 / 鉴权 / 版本时，`MapGroup` 最合适；但端点极少、又不需要任何分组时，直接在 `Program` 内联定义反而更简单，不必强行拆模块。

在 `Program.cs` 里注册服务与文档端点（本项目用 .NET 10 原生 OpenAPI 3.1，不使用 Swashbuckle），再把端点逻辑分流到独立模块：

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

把端点逻辑拆到独立模块，保证 `Program` 精简；handler 里直接消费 `AppDbContext`：

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

当端点需要表达多种可能的响应类型时，用内置的类型化联合让 OpenAPI 生成对应的状态码。下面同时声明了 200 与 404 两种响应：

```csharp
group.MapGet("/{id:guid}", async (Guid id, AppDbContext db, CancellationToken ct) =>
    await db.Orders.FindAsync(new object[] { id }, ct) is { } order
        ? Results.Ok(order)
        : Results.NotFound())
    .Produces<Order>(StatusCodes.Status200OK)
    .ProducesProblem(StatusCodes.Status404NotFound);
```

❌ 反面教材：自己再定义一个 `Result<T>` 泛型联合类型，和 Minimal API 内置的 `Results<T>` / `TypedResults` 语义重复，纯属重复造轮子：

```csharp
public record Result<T>(bool IsSuccess, T? Value, string? Error); // 重复造轮子
```

其余常见错误：

- **引入 Controller**：本项目约定全部端点用 Minimal API，不应混用 Controller 风格。
- **额外封装 Repository / 工作单元去包裹 `DbContext`**：那是对 EF Core 的重复抽象。
- **把所有端点堆在一个巨型文件里**：应按模块拆分到独立扩展方法，保持可维护性。
- **在 handler 里返回原始对象却不声明 `Produces`**：OpenAPI 文档会缺响应结构。

版本方面，所有受支持版本通用，无差异。其中从 .NET 10 起使用原生 OpenAPI 3.1（见 [OpenAPI 3.1](../dotnet/aspnet-core/aspnet-core-10.md#openapi-3-1)），不再使用 Swashbuckle。

## 参考资料

- [Options 模式官方文档](https://learn.microsoft.com/dotnet/core/extensions/options)
- [.NET 通用宿主官方文档](https://learn.microsoft.com/dotnet/core/extensions/generic-host)
- [ASP.NET Core Minimal API](https://learn.microsoft.com/aspnet/core/fundamentals/minimal-apis)
- 相关：[依赖注入](../dotnet/fundamentals/dependency-injection.md)
- 相关：[释放与 using](disposable-using.md)
- 相关：[EF Core 数据访问](../dotnet/ef-core/ef-data-access.md)
- 相关：[OpenAPI 3.1（aspnet-core）](../dotnet/aspnet-core/aspnet-core-10.md#openapi-3-1)
