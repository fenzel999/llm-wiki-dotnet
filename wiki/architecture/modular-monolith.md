---
title: 模块化单体架构
summary: 单进程部署、内部按业务模块强边界解耦的架构——兼顾单体的运维简单与微服务的清晰边界。
tags: [architecture, modular-monolith, ddd, aspnet-core, net10]
introduced-in: general
applies-to: [all]
status: stable
source: https://learn.microsoft.com/dotnet/architecture/microservices/
updated: 2026-07-10
---

# 模块化单体架构（Modular Monolith）

> **要点速览**
> - 单进程内按模块强边界解耦，兼顾单体的简单与微服务的边界。
> - 模块间只经公开契约通信，不碰彼此内部/数据表。
> - 是微服务的推荐前置形态；边界稳定后再按需拆分。

> **在体系中的位置**：第 1 步 · 边界形态（单体还是微服务）。先读 [架构总览与决策指南](overview.md)；与 [微服务](microservices.md) 是二态；内部用 [整洁架构](clean-architecture.md)/[六边形架构](hexagonal-architecture.md) + [解决方案分层](solution-structure.md)，边界即未来 [限界上下文](bounded-context.md)，用 [架构测试](architecture-tests.md) 锁边界。

## 概述

**模块化单体**是一种介于「传统单体」和「微服务」之间的架构：应用仍然作为**单个进程、单个部署单元**运行，但在代码内部被切分成若干**高内聚、低耦合、边界明确**的业务模块（module），例如 `Orders`、`Billing`、`Identity`。每个模块拥有自己的领域逻辑、数据与对外契约，模块之间**只能通过公开契约或进程内事件通信**，禁止直接访问对方的内部类型或数据表。

它想解决的核心问题是：微服务能带来清晰的边界，但很多团队其实只是想要「边界」，却被迫连带承担了分布式系统的全部代价——网络调用、分布式事务、独立部署编排、可观测性成本。模块化单体让你**先在一个进程里把边界划清楚**，把分布式的复杂度推迟到真正需要独立伸缩时再引入。正如 Simon Brown 的那句话：**「为收益而选择微服务，而不是因为你的单体代码烂成一团。」**

一个典型的判断：**中小团队、领域仍在演进、对成本敏感**时，模块化单体往往是更划算的默认选择；而当组织庞大、领域稳定、多个自治团队需要各自独立伸缩时，才更适合微服务。

## 正确做法

### 1. 一个模块 = 一个业务切片，默认 `internal`

模块应当以**业务能力**（bounded context）而非技术分层来划分。每个模块单独一个项目（程序集），类型**默认 `internal`**，只暴露一层很窄的公开契约：

```csharp
// Orders 模块：对外只暴露契约，实现全部 internal
namespace Orders.Contracts;

public sealed record PlaceOrderRequest(Guid CustomerId, IReadOnlyList<OrderLine> Lines);
public sealed record OrderLine(Guid ProductId, int Quantity);

public interface IOrderService
{
    Task<Guid> PlaceOrderAsync(PlaceOrderRequest request, CancellationToken ct = default);
}
```

```csharp
// 实现放在 Orders.Application，标记 internal，外部模块无法直接 new 或引用
namespace Orders.Application;

internal sealed class OrderService(OrdersDbContext db) : Orders.Contracts.IOrderService
{
    public async Task<Guid> PlaceOrderAsync(Orders.Contracts.PlaceOrderRequest request, CancellationToken ct = default)
    {
        var order = Order.Create(request.CustomerId, request.Lines);
        db.Orders.Add(order);
        await db.SaveChangesAsync(ct);
        return order.Id;
    }
}
```

用 C# 的 `internal` 访问级别把「哪些是模块公共表面、哪些是内部实现」变成**编译器强制**的约束，而不只是口头约定。

### 2. 每个模块自带注册入口

让每个模块提供自己的 DI 注册扩展方法，宿主（host）只负责把它们组装起来。这样模块的依赖是自包含的，新增/移除模块不牵动其它代码——这与[依赖注入](../dotnet/fundamentals/dependency-injection.md)的组合思路一致：

```csharp
// Orders 模块提供自己的注册入口
namespace Orders;

public static class OrdersModule
{
    public static IServiceCollection AddOrdersModule(this IServiceCollection services, IConfiguration config)
    {
        services.AddDbContext<OrdersDbContext>(o =>
            o.UseSqlServer(config.GetConnectionString("Orders")));
        services.AddScoped<Orders.Contracts.IOrderService, Orders.Application.OrderService>();
        return services;
    }
}
```

```csharp
// 宿主 Program.cs：只是把各模块拼起来
var builder = WebApplication.CreateBuilder(args);

builder.Services
    .AddOrdersModule(builder.Configuration)
    .AddBillingModule(builder.Configuration)
    .AddIdentityModule(builder.Configuration);

var app = builder.Build();

app.MapOrdersEndpoints();
app.MapBillingEndpoints();

app.Run();
```

Web 层用 [Minimal API 组织方式](../patterns/composition.md#minimal-api-organization)按模块拆分端点，配合 [ASP.NET Core 10](../dotnet/aspnet-core/aspnet-core-10.md) 的内置验证与 OpenAPI。

### 3. 数据隔离：每模块独立 `DbContext`（或独立 schema）

数据边界是模块边界最容易被破坏的地方。**每个模块用自己的 `DbContext`**，并尽量落在独立的数据库 schema 上；即使共用一个物理数据库，也不要让一个模块的实体直接 join 另一个模块的表。EF Core 用 schema 隔离很自然（数据访问细节见 [EF Core 数据访问](../dotnet/ef-core/ef-data-access.md)）：

```csharp
internal sealed class OrdersDbContext(DbContextOptions<OrdersDbContext> options) : DbContext(options)
{
    public DbSet<Order> Orders => Set<Order>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.HasDefaultSchema("orders"); // 该模块独占 orders schema
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(OrdersDbContext).Assembly);
    }
}
```

这样做的好处是：当某个模块日后真要抽成微服务，它的表已经天然聚在一个 schema 里，迁移成本大幅降低。

### 4. 模块间通信：契约调用 + 进程内领域事件

两个模块要协作时，**不要**互相引用内部实现。有两种正确姿势：

- **同步**：通过 `*.Contracts` 里的接口/DTO 调用（如上面的 `IOrderService`）。
- **异步 / 解耦**：抛出**进程内领域事件**，让关心的模块各自订阅。无需第三方中介库（[P10](../governance/policy.md) 不引 MediatR）——手写一个极简事件分发器即可：只用内置 DI 收集所有订阅者并依次调用。

```csharp
// 契约（放在 Contracts，可被其它模块订阅）
public sealed record OrderPlaced(Guid OrderId, Guid CustomerId);
public interface IDomainEventHandler<in T> { Task Handle(T e, CancellationToken ct); }

// 手写分发器：从 DI 取出所有订阅者依次调用
public sealed class DomainEventDispatcher(IServiceProvider sp)
{
    public async Task Publish<T>(T e, CancellationToken ct)
    {
        foreach (var h in sp.GetServices<IDomainEventHandler<T>>())
            await h.Handle(e, ct);
    }
}

// Billing 模块订阅，彼此不直接引用实现
internal sealed class CreateInvoiceOnOrderPlaced(IInvoiceService invoices)
    : IDomainEventHandler<OrderPlaced>
{
    public Task Handle(OrderPlaced e, CancellationToken ct) =>
        invoices.CreateDraftAsync(e.OrderId, e.CustomerId, ct);
}
// 注册：builder.Services.AddScoped<IDomainEventHandler<OrderPlaced>, CreateInvoiceOnOrderPlaced>();
```

进程内事件让模块**在编译期解耦**，同时保留了日后换成消息队列（真正跨进程）的升级路径。

### 5. 用架构测试守住边界 {#用架构测试守住边界}

边界最大的敌人是时间——一年后总有人「图方便」直接引用了别的模块内部类型。把边界写成**架构测试**，让 CI 自动拦截：

用内置反射手写即可，无需第三方架构测试库（[P10](../governance/policy.md)）——扫描程序集里每个类型引用到的类型，断言没有一个落在禁止的命名空间：

```csharp
[Fact]
public void Orders_should_not_depend_on_Billing_internals()
{
    var offenders = typeof(OrdersModule).Assembly.GetTypes()
        .SelectMany(t => t.GetMethods(BindingFlags.Public | BindingFlags.NonPublic
                                      | BindingFlags.Instance | BindingFlags.Static | BindingFlags.DeclaredOnly))
        .SelectMany(m => m.GetParameters().Select(p => p.ParameterType).Append(m.ReturnType))
        .Where(t => t.Namespace?.StartsWith("Billing.Application") == true)  // 只允许依赖 Billing.Contracts
        .Select(t => t.FullName)
        .Distinct();

    Assert.Empty(offenders);
}
```

### 6. 二态部署：同一模块，既是单体模块、也是独立微服务 {#二态部署}

模块化单体真正的价值，是让**同一份模块代码**能在两种部署形态间平滑切换：进程内组装成单体，或独立宿主成微服务。诀窍是：**模块内部（Domain/Application/Infrastructure）完全不变，只换"模块之间的接缝"**——同步调用与事件传递的实现。

| 关注点 | 单体模块（进程内） | 独立微服务（跨进程） |
|--------|--------------------|----------------------|
| 部署单元 | 一个 Host 进程装配所有模块 | 每模块自己的 Host，独立进程/容器 |
| 同步调用 | 直接注入对方 `*.Contracts` 接口（本地实现） | 对方 `*.Contracts` 接口的 **HTTP/gRPC 客户端**实现 |
| 事件通信 | [进程内领域事件](domain-events.md)，同事务同步分发 | [集成事件 + 发件箱](event-driven.md)，经消息中间件跨进程 |
| 数据 | 各模块独立 schema，同一数据库 | 各模块独立数据库 |
| 事务 | 本地事务（一次 `SaveChanges`） | 最终一致（发件箱 + 幂等消费） |

因为**跨模块只依赖 `*.Contracts`**（见[解决方案分层](solution-structure.md)），要把某个模块抽成微服务时，改的只有组合根里那一行：把"本地实现"换成"远程客户端实现"，把"进程内事件分发"换成"集成事件发布"。消费方代码不动。

```csharp
// 单体：绑定本地实现
services.AddScoped<Billing.Contracts.IInvoiceService, Billing.Application.InvoiceService>();

// 拆分后：同一接口，换成远程客户端实现（消费方无感知）
services.AddScoped<Billing.Contracts.IInvoiceService, Billing.Infrastructure.InvoiceHttpClient>();
```

这就是"先模块化单体、边界稳定后按需抽取微服务"能低成本落地的原因：边界从第一天就用契约划死，抽取只是替换接缝，不是重写。

## 常见误区

- **按技术分层当模块**：把 `Controllers` / `Services` / `Repositories` 当成「模块」。这是分层，不是模块化；业务改一处仍要横跨所有层，耦合毫无改善。模块必须按**业务能力**切。
- **共享一个大 `DbContext` 与跨模块 join**：所有模块的实体挤在一个 `DbContext` 里互相 join，边界名存实亡，未来无法拆分。应每模块独立 `DbContext` / schema。
- **模块之间直接引用内部实现**：`Orders` 直接 `new BillingService()` 或引用 `Billing.Application` 的类型。应只依赖对方的 `*.Contracts`，或通过领域事件通信。
- **一上来就上微服务**：领域边界都还没稳定，就先付出分布式系统的全部代价（网络、分布式事务、部署编排）。正确顺序是**先模块化单体、把边界跑清楚，再按需抽取**成微服务。
- **公开表面过大**：模块把几乎所有类型都设成 `public`。公共契约越大，耦合越强、越难演进。默认 `internal`，只把必要的契约设 `public`。

## 适用版本

模块化单体是一种架构风格，与具体 .NET 版本无关，适用于所有受支持版本。示例代码使用 .NET 10 / C# 14 的 Minimal API 与 EF Core 10 写法；早期版本（.NET 8 / 9）同样适用，只是个别 API 细节略有差异（见 [.NET 版本演进](../comparisons/net-evolution.md)）。

### Native AOT 兼容性

本架构的运行期写法**兼容 Native AOT**（[P16](../governance/policy.md)）：模块用**显式 DI 注册**（不做运行期程序集扫描）、事件分发靠 DI 解析而非反射、Web 层用 Minimal API。上文的**架构测试**用到反射，但那是**测试时**执行、不进入 AOT 发布产物，不受影响；EF Core 在 AOT 发布下需启用编译模型/预编译查询。

## 何时使用

- 默认起点：单团队、部署简单、领域仍在演化，却又想要清晰模块边界时，**优先模块化单体**而非直接微服务。
- 想用"微服务的清晰边界"但不愿承担多进程运维、分布式一致性的成本时。
- 作为迈向微服务的过渡：把内部模块边界画清楚，将来要拆时边界已是现成的。

## 与其他模式的关系

- 与 [微服务](microservices.md) 是"同一模块代码的二态"——区别只在部署单元，模块划分方式一致。
- 内部组织用 [整洁架构](clean-architecture.md) / [六边形架构](hexagonal-architecture.md)，物理边界用 [解决方案分层与项目引用](solution-structure.md)。
- 模块边界即未来的 [限界上下文](bounded-context.md)；用 [架构测试](architecture-tests.md) 把边界锁进 CI。
- 见 [架构总览与决策指南](overview.md) 的默认技术栈。

## 参考资料

- 官方文档：[.NET Microservices — Architecture for Containerized .NET Applications](https://learn.microsoft.com/dotnet/architecture/microservices/) — Microsoft Learn（单体、模块化与微服务的取舍）
- 官方示例：[dotnet/eShop 参考应用](https://github.com/dotnet/eShop)
- 相关：[依赖注入](../dotnet/fundamentals/dependency-injection.md)
- 相关：[EF Core 数据访问](../dotnet/ef-core/ef-data-access.md)
- 相关：[Minimal API 组织](../patterns/composition.md#minimal-api-organization)
- 相关：[ASP.NET Core 10](../dotnet/aspnet-core/aspnet-core-10.md)
